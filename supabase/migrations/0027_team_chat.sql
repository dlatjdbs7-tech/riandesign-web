-- 리안채팅방: 단체 채팅 1개 + 팀원 간 1:1 채팅

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('group', 'dm')),
  created_at timestamptz not null default now()
);

create table if not exists chat_conversation_members (
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx
  on chat_messages (conversation_id, created_at);

-- 고정된 단체 채팅방 (전 직원 공용)
insert into chat_conversations (id, type)
values ('00000000-0000-0000-0000-000000000001', 'group')
on conflict (id) do nothing;

alter table chat_conversations enable row level security;
alter table chat_conversation_members enable row level security;
alter table chat_messages enable row level security;

create or replace function public.is_chat_member(p_conversation_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from chat_conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
  )
$$;

create policy "select_group_or_member_conversations" on chat_conversations for select
  using (
    (type = 'group' and current_user_status() = 'approved')
    or is_chat_member(id)
  );

create policy "select_own_membership_rows" on chat_conversation_members for select
  using (user_id = auth.uid() or is_chat_member(conversation_id));

create policy "join_group_conversation" on chat_conversation_members for insert
  with check (
    user_id = auth.uid()
    and current_user_status() = 'approved'
    and conversation_id in (select id from chat_conversations where type = 'group')
  );

create policy "update_own_last_read" on chat_conversation_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "select_my_conversation_messages" on chat_messages for select
  using (is_chat_member(conversation_id));

create policy "send_my_conversation_messages" on chat_messages for insert
  with check (
    sender_id = auth.uid()
    and current_user_status() = 'approved'
    and is_chat_member(conversation_id)
  );

-- 팀원 목록(채팅 상대 선택용) - profiles 테이블 전체 열람 권한 없이 이름만 제공
create or replace function public.chat_directory()
returns table(id uuid, full_name text)
language sql security definer set search_path = public stable
as $$
  select id, full_name from profiles
  where status = 'approved' and id <> auth.uid()
  order by full_name
$$;

grant execute on function public.chat_directory() to authenticated;

-- 1:1 채팅방 조회/생성
create or replace function public.get_or_create_dm_conversation(other_user_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
  if me is null or other_user_id = me then
    raise exception '잘못된 대화 상대입니다';
  end if;

  if current_user_status() <> 'approved' then
    raise exception '승인된 사용자만 채팅할 수 있습니다';
  end if;

  if not exists (select 1 from profiles where id = other_user_id and status = 'approved') then
    raise exception '대화 상대를 찾을 수 없습니다';
  end if;

  select cm1.conversation_id into conv_id
  from chat_conversation_members cm1
  join chat_conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  join chat_conversations c on c.id = cm1.conversation_id
  where c.type = 'dm' and cm1.user_id = me and cm2.user_id = other_user_id
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into chat_conversations (type) values ('dm') returning id into conv_id;
  insert into chat_conversation_members (conversation_id, user_id)
  values (conv_id, me), (conv_id, other_user_id);

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_dm_conversation(uuid) to authenticated;

-- 내 대화 목록 (마지막 메시지 미리보기 + 안읽음 판단용)
create or replace function public.list_my_conversations()
returns table(
  conversation_id uuid,
  type text,
  other_user_id uuid,
  other_user_name text,
  last_read_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid
)
language plpgsql security definer set search_path = public stable
as $$
begin
  return query
  select
    c.id,
    c.type,
    other_member.user_id,
    other_profile.full_name,
    my_member.last_read_at,
    lm.content,
    lm.created_at,
    lm.sender_id
  from chat_conversation_members my_member
  join chat_conversations c on c.id = my_member.conversation_id
  left join chat_conversation_members other_member
    on other_member.conversation_id = c.id
    and other_member.user_id <> auth.uid()
    and c.type = 'dm'
  left join profiles other_profile on other_profile.id = other_member.user_id
  left join lateral (
    select m.content, m.created_at, m.sender_id
    from chat_messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where my_member.user_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
end;
$$;

grant execute on function public.list_my_conversations() to authenticated;

alter publication supabase_realtime add table chat_messages;
