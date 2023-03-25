// 一个简单向量数据库实现
// 基于余弦相似度算法搜索

const fs = require('fs');

// Example class
class VectorDatabase {
  constructor() {
    this.vectors = [];
  }

  addVector(vector) {    
    const data = JSON.stringify(this.vectors);
    fs.writeFileSync('vectors.json', data);

    this.vectors.push(vector);
  }

  getVector(index) {
    return this.vectors[index];
  }

  getAllVectors() {
    return this.vectors;
  }

  deleteVector(index) {
    this.vectors.splice(index, 1);
  }

  updateVector(index, vector) {
    this.vectors[index] = vector;
  }

  saveVectors() {
    const data = JSON.stringify(this.vectors);
    fs.writeFileSync('vectors.json', data);
  }

  searchSimilarVectors(vector, threshold) {
    const similarVectors = [];
    for (let i = 0; i < this.vectors.length; i++) {
      const similarity = cosineSimilarity(vector, this.vectors[i]);
      if (similarity >= threshold) {
        similarVectors.push(this.vectors[i]);
      }
    }
    return similarVectors;
  }
}

function cosineSimilarity(vector1, vector2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  return dotProduct / (magnitude1 * magnitude2);
}

// 使用示例/Example usage:
const db = new VectorDatabase();
db.addVector([1, 2, 3]);
db.addVector([4, 5, 6]);
console.log(db.getVector(0)); // [1, 2, 3]
console.log(db.getAllVectors()); // [[1, 2, 3], [4, 5, 6]]
db.deleteVector(0);
console.log(db.getAllVectors()); // [[4, 5, 6]]
db.updateVector(0, [7, 8, 9]);
console.log(db.getAllVectors()); // [[7, 8, 9]]
db.saveVectors();
console.log(db.searchSimilarVectors([4, 5, 6], 0.5)); // [[7, 8, 9]]
console.log(db.searchSimilarVectors([4, 5, 6], 0.5)); // [[7, 8, 9]]
