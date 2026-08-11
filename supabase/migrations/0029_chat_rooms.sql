-- 여러 개의 단체 채팅방을 만들 수 있도록 확장

alter table chat_conversations add column if not exists name text;
alter table chat_conversations add column if not exists created_by uuid references profiles(id);

update chat_conversations
set name = '리안채팅방'
where id = '00000000-0000-0000-0000-000000000001' and name is null;

-- 새 단체 채팅방 생성 (승인된 직원 누구나)
create or replace function public.create_chat_room(room_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
  if current_user_status() <> 'approved' then
    raise exception '승인된 사용자만 방을 만들 수 있습니다';
  end if;
  if trim(room_name) = '' then
    raise exception '방 이름을 입력해주세요';
  end if;

  insert into chat_conversations (type, name, created_by) values ('group', trim(room_name), me)
  returning id into conv_id;
  insert into chat_conversation_members (conversation_id, user_id) values (conv_id, me);

  return conv_id;
end;
$$;

grant execute on function public.create_chat_room(text) to authenticated;

-- 전체 단체 채팅방 목록 (가입 여부와 무관하게 열람 가능, 눌러서 들어갈 수 있도록)
create or replace function public.list_group_rooms()
returns table(
  conversation_id uuid,
  name text,
  created_by uuid,
  is_member boolean,
  last_message text,
  last_message_at timestamptz
)
language plpgsql security definer set search_path = public stable
as $$
begin
  return query
  select
    c.id,
    coalesce(c.name, '이름없는 방'),
    c.created_by,
    exists (
      select 1 from chat_conversation_members m
      where m.conversation_id = c.id and m.user_id = auth.uid()
    ),
    lm.content,
    lm.created_at
  from chat_conversations c
  left join lateral (
    select m.content, m.created_at
    from chat_messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.type = 'group'
  order by coalesce(lm.created_at, c.created_at) desc;
end;
$$;

grant execute on function public.list_group_rooms() to authenticated;

-- 방 삭제는 대표만 가능 (기본 단체방인 리안채팅방은 보호)
create policy "owner_delete_group_room" on chat_conversations for delete
  using (
    type = 'group'
    and current_user_role() = 'owner'
    and current_user_status() = 'approved'
    and id <> '00000000-0000-0000-0000-000000000001'
  );
