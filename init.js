'use strict';

require('dotenv').config()
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const indexLib = require('./index');
const POSTGRES_URL = process.env.POSTGRES_URL || "postgres://user:user@xxx.com:5055/doc_db"
const log = function() { console.log(...arguments) };

var _ = module.exports;

_.vectors = async function (params, context) {

	const oriDirectory = params.oriDirectory || '';
	const sql = postgres(POSTGRES_URL);

	// 建立索引
	traverseFiles(oriDirectory, '.md');
	const files = JSON.parse( fs.readFileSync( "./filestore.json", "utf8" ) );

	// 将读取并分片后的文件进行格式化缓存，便于大量数据长时间向量化，网络异常导致的无法断点续传
	splitDocuments(files, 1500); //每个文件切分为token/字母
	const docs = JSON.parse( fs.readFileSync( "./docstore.json", "utf8" ) );


	const ret = await initVector(sql, docs);
  	log("ret json: ", JSON.stringify(ret));


	// 若使用`HierarchicalNSW`作为向量数据库，可使用如下方式初始化
	// const distDirectory = "./vectorstores.hnsw.weda/";
	// const numDimensions = 1536; // the length of data point vector that will be indexed.
	// const spaceName = 'cosine'; //spaceName: l2/cosine/ip
	// const index = new HierarchicalNSW(spaceName, numDimensions);  //spaceName: l2/cosine/ip

    return;

};



// 初始化文件的向量数据
async function initVector(sql, docs){

	log({"docs length": docs.length})
	const maxElements = docs.length || 500; // the maximum number of data points.  最多处理500个文件

    for (let j = 0; j < maxElements; j++ ) {
	    const input = docs[j].content;
	    const filename = docs[j].filename;
	    const fileIndex = docs[j].fileIndex
	    const docIndex = docs[j].docIndex

	    // 通过根据训练日志返回断点docIndex，调整 docIndex 的值，确保从断点继续向量化
	    if(docIndex >= 0 &&  docIndex < 1000 ){

		    log("start embedding fileIndex: ", fileIndex, 'docIndex: ', docIndex, "filename:", filename);

		    const embedding = await indexLib.embedding(input);

			const embeddingArr = "[" + embedding + "]";
		    const metadata = { filename, "doclength": maxElements, index: j };

			const insertRet = await sql`
				INSERT INTO documents ( content, appcode, metadata, embedding )
					VALUES
				( ${input}, 'wedadoc',  ${metadata}, ${embeddingArr} )`

	      	await delay(1000); // 如果embedding API有分钟内并发请求限制，可设置随机数sleep

    	}
    	else {
    		continue;
    	}

    }

    return true;

}


// 根据路径读取文件数据，并且按需切分成chunk
function splitDocuments(files, chunkSize) {

	let docSize = chunkSize || 1000;
	let textString = '';
	let index = 0;
	let documents = [];

	log("before split docs, length = ", files.length)

	for(let i = 0, len = files.length; i < len; i++) {

		if(files[i] && files[i].content) {
			textString = files[i].content;
		}
		else {
			textString = fs.readFileSync(files[i], "utf8");
		}
		textString = textString.replace(/\n|\r/g, " ").replace(/<.*?>/g,"")

	    let start = 0;
	    while (start < textString.length) {
	      const end = start + docSize;
	      const chunk = textString.slice(start, end);
	      documents.push({ docIndex: index++, fileIndex: files[i].fileIndex, filename: files[i].filename || files[i], content: chunk });
	      start = end;
		}
  	}
  	log("split doc done, length = ", documents.length);

	fs.writeFileSync("./docstore.json", JSON.stringify(documents));

  	return documents;
}


function storeFilesJSON(files) {

	let textString = '';
	let docs = [];
	for(let i = 0, len = files.length; i < len; i++) {
		textString = fs.readFileSync(files[i], "utf8");
		docs.push({fileIndex: i, filename: files[i], content: textString })
	}

	fs.writeFileSync("./filestore.json", JSON.stringify(docs));

}


function delay(time) {
  	return new Promise(resolve => setTimeout(resolve, time));
} 


// 便利指定目录下的所有文件的path
function traverseFiles(dir, fileType) {
    let filesArr = [];
    fileType = fileType || '.md'
    dir = path.join(dir, '/');

	(function walkSync(currentDirPath) {
	  fs.readdirSync(currentDirPath, { withFileTypes: true }).forEach(function (dirpath) {
	    let filePath = path.join(currentDirPath, dirpath.name);
	    if ( dirpath.isFile() && path.extname(filePath) == fileType ) {
	    	filesArr.push(filePath);
	    } else if (dirpath.isDirectory()) {
	    	walkSync(filePath);
	    }
	  });
	})(dir)

	storeFilesJSON(filesArr);

    return filesArr;
}

