--  RUN 1st, 安装插件
create extension vector;


--  RUN 2st，创建文档存储表
create table documents (
  id bigserial primary key,
  content text, -- corresponds to Document.pageContent
  metadata json, -- corresponds to Document.metadata
  embedding vector(1536) -- 1536 works for OpenAI embeddings, change if needed
);


--  RUN 3st，创建查询函数
create or replace function match_documents (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata json,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > similarity_threshold  
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- RUN 4th, 建立索引
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

