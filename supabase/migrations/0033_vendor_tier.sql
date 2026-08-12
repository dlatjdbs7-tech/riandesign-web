alter table vendors add column if not exists tier text;
update vendors set tier = '메인' where tier is null;
