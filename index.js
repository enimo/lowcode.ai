'use strict';

require('dotenv').config()
const postgres = require('postgres');
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-xxxx";
const OPENAI_URL = process.env.OPENAI_URL || "https://api.openai.com";
const POSTGRES_URL = process.env.POSTGRES_URL || "postgres://user:user@xxx.com:5055/doc_db"

const log = function() { console.log(...arguments) };

var _ = module.exports;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0


_.main = async function (params, context) {

    console.time("ALL_Timer");

    const query = params.text || '';
    const openid = params.openid || ''; 
    
    if(openid == '' || query == '') {
        return { openid, errCode: 22001, 'choices': [{'text': '异常请求，query/openid为空'}] };
    }

    // 初始化向量PG数据库
    const sql = postgres(POSTGRES_URL);

    // 开始向量搜索: k=1, 表示返回最相似的1条，可根据此参数按需控制上下文长度）
    const documents = await _.searchKnn(query, 1, sql); // default k = 1
    log("documents length: ", documents.length, "\nret json: ", JSON.stringify(documents));


    // 带上下文请求ChatGPT
    const retData = await _.getChatGPT(query, documents);
    log("gpt returen data: ", JSON.stringify(retData));


    // 计算耗时情况
    console.timeEnd("ALL_Timer");

    // 返回数据 和出参结构映射
    return {openid, errCode: 22000, params, ...retData};

    
}

// 请求ChatGPT 3.5
_.getChatGPT = async function (query, documents){

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
      ${query}`;

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
                "model": "gpt-3.5-turbo", 
                "messages": messages,
                "temperature": 0.5, 
                "max_tokens": 2000,
            })
        }
    );

    return await chatResponse.json();

}



// 从向量数据中搜索最相似的上下文
_.searchKnn = async function(question, k, sql){

    const embedding = await _.embedding(question);
    log({embedding});

    const embeddingArr = "[" + embedding + "]";
    const result = await sql`SELECT * FROM match_documents(${embeddingArr},'wedadoc5', 0.1, ${k})`

    return result;

}


// 使用OPENAI EMBEDDING对文本向量化
_.embedding = async function (text) {

    const raw_text = text.replace(/\n|\r/g, " ");

    const embeddingResponse = await fetch(
        OPENAI_URL + "/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            input: raw_text,
            model: "text-embedding-ada-002"
          })
        }
    );

    const embeddingData = await embeddingResponse.json();    
    const [{ embedding }] = embeddingData.data;
    log({embedding});

    return embedding;
}