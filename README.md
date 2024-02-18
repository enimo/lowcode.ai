<!-- Title -->

# Lowcode.AI documents training
一个简单的结合低代码和向量数据库的AI知识库搜索实现.

A simple AI knowledge base search implementation combining low code and PostgreSQL vector database 🐶 
<p>
<img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/enimo/lowcode.ai" />
<img alt="GitHub Last Commit" src="https://img.shields.io/github/last-commit/enimo/lowcode.ai" />
<img alt="" src="https://img.shields.io/github/repo-size/enimo/lowcode.ai" />
<img alt="GitHub Issues" src="https://img.shields.io/github/issues/enimo/lowcode.ai" />
<img alt="GitHub Pull Requests" src="https://img.shields.io/github/issues-pr/enimo/lowcode.ai" />
<img alt="Github License" src="https://img.shields.io/github/license/enimo/lowcode.ai" />
</p>

<a href="https://github.com/enimo/lowcode.ai">
    <img width="60%" src="https://github.com/enimo/lowcode.ai/blob/main/assets/weda_showcase.png?raw=true">
</a>



## Getting Started /准备工作

### 📦 Installation / 初始化本地环境

- 下载实验代码: 
```bash
git clone git@github.com:enimo/lowcode.ai.git
cd lowcode.ai && code .
```
- 安装依赖
```bash
npm install
```
- 在根目录下创建一个.env文件来存储环境变量:
```bash
cp .env.example .env
```
- 打开 `.env.example` 文件并添加`POSTGRES_URL`，对应你的Postgres数据库URL、数据库用户和密钥等
- 在 `.env.example`中添加你的OPENAI_API_KEY以及OPENAI_URL（某些地区访问需要Proxy OPENAI的访问地址）


### 🎨 Usage / 实验和测试
#### 添加训练数据
目前默认在`./train_data`目录下放了一下markdown的测试数据，可以自行添加，向量初始化时，会自动遍历目录下所有的`.md`文件

<a href="https://github.com/enimo/lowcode.ai">
    <img width="80%" src="https://github.com/enimo/lowcode.ai/blob/main/assets/vector_flow.png?raw=true">
</a>

#### Usage/测试和使用
- 向量初始化：
```bash
npm test init
```

- 向量搜索：
```bash
npm test search
```


## 🗄️ 使用不同的向量数据库

### Option1 PostgreSQL 
本示例是以[PostgreSQL](https://www.postgresql.org/)作为向量存储数据库，需求提前开启`PostgreSQL`的`vector`插件，则需要如下准备工作:

除本示例中默认的PostgreSQL作为向量存储的数据库以外，你也可以选择其他的向量数据库，可参考文末推荐，
另外，如果条件成熟，除了云服务厂商提供的PostgreSQL以外，也可以自行基于docker部署，记得安装vector的扩展。



-  首先，启用PostgreSQL的vector扩展，可以直接在SQL命令中运行（也可以使用[PGAdmin](https://github.com/pgadmin-org/pgadmin4)来作为PG的可视化UI）：

```
create extension vector;
```

- 接下来，创建一个表来存储的文本和向量化后embedding。在SQL命令行中运行：
```sql
create table documents (
  id bigserial primary key,
  content text,
  metadata json,
  embedding vector (1536)
);
```
其中1536维度是OPENAI的embedding默认支持的维度，`metadata`可以用来存放一些文件附加信息，比如文件名/索引信息之类。


- 最后，再创建一个查询函数，用来进行相似性搜索。在SQL命令行中运行：

```sql
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
```



### Option 2, 使用Node的HNSWlib包

如果是使用`HNSWlib`的npm包，则可以直接在内存中引用

`npm install hnswlib-node`

然后在示例代码中导入即可，更多详细介绍可移步参考[hnswlib-node](https://github.com/yoshoku/hnswlib-node):

`import { HierarchicalNSW } from 'hnswlib-node'`


### Option 3, 使用Langchain等工具链

如果想省事，也可以使用`langchain`封装的一系列工具包.

更多详细介绍可移步参考：[langchain](https://github.com/hwchase17/langchain)



## 👋 Contributing

We welcome contributions from developers of all levels to our open-source project on GitHub. 



## 📄 License

Lowcode.AI is released under the MIT License. See the LICENSE file for details.


