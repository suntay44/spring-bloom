-- Migration 020: Chat attachments (images, CSVs, PDFs, files)
-- Pairs with the Supabase Storage bucket `chat-attachments` (created via Storage API).

create table public.chat_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references public.messages(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  kind         text not null check (kind in ('image','csv','pdf','file')),
  storage_path text not null,
  filename     text not null,
  size_bytes   integer not null,
  mime_type    text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz default now()
);

create index chat_attachments_message_id_idx on public.chat_attachments(message_id);
create index chat_attachments_project_id_idx on public.chat_attachments(project_id);

alter table public.chat_attachments enable row level security;

create policy "users own their attachments"
  on public.chat_attachments for all
  using (auth.uid() = user_id);
