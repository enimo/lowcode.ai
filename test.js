'use strict';

const lowcode = require('./index');
const init = require('./init');
const log = function() { console.log(...arguments) };


async function run() {

	const cmd = process.argv && process.argv[2] || '';
	log({cmd});

	switch (cmd){
		case 'init': 
			// step 1: 测试 将文本等数据向量化
			log("init.vectors return: ", await init.vectors({
				"oriDirectory": "./train_data/" // 预训练数据根目录
			}));
			break;

		case 'rag':
			// step 2:  测试基于向量搜索
			log("lowcode.main return: ", await lowcode.main({
				"openid": "wedaQdTHDHjkhdaHFDH32dhalj",
				"isRAG": true,
				"text": "解释下微搭的生命周期"
			}));
			break;

		case 'chat':
			// step 2:  测试基于向量搜索
			log("lowcode.main return: ", await lowcode.main({
				"openid": "wedaQdTHDHjkhdaHFDH32dhalj",
				"text": "最近工作压力有点大"
			}));
			break;

		default:
			log("no command");

	}

}

run();



