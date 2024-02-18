'use strict';

require('dotenv').config()
const postgres = require('postgres');
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-xxxx";
const OPENAI_URL = process.env.OPENAI_URL || "https://api.baichuan-ai.com";
const log = function() { console.log(...arguments) };

var _ = module.exports;
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0


_.main = async function (params, context) {

    console.time("ALL_Timer");

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
        // todo
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
