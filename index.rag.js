'use strict';

require('dotenv').config()
const postgres = require('postgres');
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-xxxx";
const OPENAI_URL = process.env.OPENAI_URL || "https://api.baichuan-ai.com";
const EMBEDDING_URL = process.env.EMBEDDING_URL || "https://api.baichuan-ai.com";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || "sk-xxxx";
const POSTGRES_URL = process.env.POSTGRES_URL || "postgres://user:user@xxx.com:5055/doc_db"

const log = function() { console.log(...arguments) };

var _ = module.exports;
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0


_.main = async function (params, context) {

    console.time("ALL_Timer");
    log({params})
    
    const text = params.text || '';
    const openid = params.openid || ''; 
    const lang = params.lang || 'Chinese'; 
    const isRAG = params.isRAG || false; 
    var messages = [];
    
    if(openid == '' || text == '') {
        return { openid, errCode: 22001, 'choices': [{'text': '异常请求，text/openid为空'}] };
    }

    // 默认 messages
    messages = [
            {"role": "system", "content": "You are a professional psychologist." },
            {"role": "user", "content": "I will provide you my thoughts. I want you to give me scientific suggestions that will make me feel better.  Request a response in "+ lang +". My thought is:  "+ text +"\n" }
    ];

    if(isRAG){
        // 初始化向量PG数据库
        const sql = postgres(POSTGRES_URL);

        // 开始向量搜索: k=1, 表示返回最相似的1条，可根据此参数按需控制上下文长度）
        const documents = await _.searchKnn(text, 3, sql); // default k = 1
        log("documents length: ", documents.length, "\nret json: ", JSON.stringify(documents));
        // 生成 RAG 后的 messages
        messages = await _.genMessages(text, documents);
    }



    // 带上下文请求ChatGPT
    const retData = await _.getGPTRes(messages);

    log("gpt returen data: ", JSON.stringify(retData));

    // 计算耗时情况
    console.timeEnd("ALL_Timer");

    // 返回数据 和出参结构映射
    return {openid, errCode: 22000, params, ...retData};

}


// 请求大模型 GPT 
_.getGPTRes = async function (messages){
    
    log({messages})

    const chatResponse = await fetch(
        OPENAI_URL + "/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "Baichuan2-Turbo", //gpt-3.5-turbo
                "messages": messages,
                "temperature": 0.5, 
                "max_tokens": 2000,
            })
        }
    );

    return await chatResponse.json();

}


// 根据向量搜索结果生成 message
_.genMessages = async function(text, documents) {

    let contextText = "";
    if (documents) {
        for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            const content = document.content;  
            const url_prefix = 'https://github.com/tencentyun/qcloud-documents/blob/master/product/%E7%A7%BB%E5%8A%A8%E4%B8%8E%E9%80%9A%E4%BF%A1/%E4%BA%91%E5%BC%80%E5%8F%91%E4%BD%8E%E4%BB%A3%E7%A0%81%E5%B9%B3%E5%8F%B0/';
            const url = url_prefix + encodeURI(document.metadata['filename']);
            contextText += `${content.trim()}\n SOURCE: ${url}\n---\n`;
        }
    }

    const systemContent = `You are a helpful assistant. When given CONTEXT you answer questions using only that information,
      and you always format your output in markdown. You include code snippets if relevant. If you are unsure and the answer
      is not explicitly written in the CONTEXT provided, you say "抱歉, 这个问题超出我的知识范围".`;

    const userMessage = `CONTEXT:
      ${contextText}
      
      USER QUESTION: 
      ${text}`;

    const messages = [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: userMessage
        }
    ];

    return messages;

}


// 从向量数据中搜索最相似的上下文
_.searchKnn = async function(question, k, sql){

    const embedding = await _.embedding(question);
    // log({embedding});

    const embeddingArr = "[" + embedding + "]";
    const result = await sql`SELECT * FROM match_documents(${embeddingArr},'wedadoc5', 0.1, ${k})`

    return result;

}


// 使用OPENAI EMBEDDING对文本向量化
_.embedding = async function (text) {

    const raw_text = text.replace(/\n|\r/g, " ");

    const embeddingResponse = await fetch(
        EMBEDDING_URL + "/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${EMBEDDING_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            input: raw_text,
            model: "text-embedding-ada-002" // "Baichuan-Text-Embedding"
          })
        }
    );

    const embeddingData = await embeddingResponse.json();  
    // log({embeddingData});

    // const embedding = embeddingData.data;
    const [{ embedding }] = embeddingData.data;

    return embedding;
}
