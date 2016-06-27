# Create index
```
curl -XPUT http://127.0.0.1:9200/fum -d '{
    "settings" : {
      "number_of_shards" : 2,
      "number_of_replicas" : 1
    }
  }'
```

**Delete index(if need)**
```
curl -XDELETE http://127.0.0.1:9200/fum
```

# Create mapping

Query format: `PUT http://<server>/<index_name>/<type_name>/_mapping`

```
curl -XPUT 'http://localhost:9200/fum/shop/_mapping' -d '{
  "shop" : {
    "properties" : {
      "name" : {"type": "string", "index": "analyzed"},
      "description" : {"type": "string", "index": "analyzed"},
      "ownerId": {"type": "integer", "index": "not_analyzed"},
      "shipPlaceIds": {"type": "integer", "index": "not_analyzed"},
      "opening": {"type": "boolean", "index": "not_analyzed"}
    }
  }
}'
```

Confirm the mapping:
```
curl -XGET 'http://localhost:9200/fum/shop/_mapping?pretty=true'
```

# Add custom text analyzer
Close the index before modify analyzer:
```
curl -XPOST 'localhost:9200/fum/_close'
```

Add Folding Analyzer (hỗ trợ tiếng Việt không dấu khi search)
```
curl -XPUT http://127.0.0.1:9200/fum/_settings -d '{
  "analysis": {
    "analyzer": {
      "folding": {
        "tokenizer": "standard",
        "filter":  [ "lowercase", "asciifolding" ]
      }
    }
  }
}'
```

Open the index again
```
curl -XPOST 'localhost:9200/fum/_open'
```

*Note*: To test the analyzer, use:
```
curl -XPOST 'localhost:9200/fum/_analyze?analyzer=folding&pretty' -d 'thử tiếng việt có dấu xem nào'
```

# Modify the mapping to retain meaning when using folding analyzer 
*Dùng để hỗ trợ search cả tiếng việt có dấu nữa, vì sau khi làm xong cái kia thì mọi data đều bị chuyển về dạng không dấu, có nguy cơ mất ngữ nghĩa*
Delete index to change mapping
```
curl -XDELETE 'http://localhost:9200/fum/'
```

Recreate index with new mappings and new analyzers
```
curl -XPUT http://127.0.0.1:9200/fum -d '{
    "settings" : {
      "number_of_shards" : 2,
      "number_of_replicas" : 1,
      "index": {
        "analysis": {
          "analyzer": {
            "folding": {
              "tokenizer": "standard",
              "filter":  [ "lowercase", "asciifolding" ]
            }
          }
        }
      }
    },
    "mappings": {
      "shop": {
        "properties": {
          "name" : {
            "type": "string",
            "analyzer": "standard",
            "fields": {
              "folded": {
                "type": "string",
                "analyzer": "folding"
              }
            }
          },
          "description": {
            "type": "string",
            "index": "analyzed",
            "fields": {
              "folded": {
                "type": "string",
                "analyzer": "folding"
              }
            }
          },
          "avatar": {
            "type": "string",
            "index": "no"
          },
          "cover": {
            "type": "string",
            "index": "no"
          },
          "seller" : {
            "properties" : {
              "id" : {
                "type" : "integer",
                "index": "not_analyzed"
              },
              "fullName" : {
                "type" : "string",
                "index": "analyzed",
                "fields": {
                  "folded": {
                    "type": "string",
                    "analyzer": "folding"
                  }
                }
              }
            }
          },
          "items": {
            "properties": {
              "name" : {
                "type" : "string",
                "index": "analyzed",
                "fields": {
                  "folded": {
                    "type": "string",
                    "analyzer": "folding"
                  }
                }
              },
              "description" : {
                "type" : "string",
                "index": "analyzed",
                "fields": {
                  "folded": {
                    "type": "string",
                    "analyzer": "folding"
                  }
                }
              },
              "image": {
                "type": "string",
                "index": "no"
              }
            }
          },
          "banned": {"type": "boolean", "index": "not_analyzed", "null_value": false},
          "categoryIds": {"type": "integer", "index": "not_analyzed"},
          "shipPlaceIds": {"type": "integer", "index": "not_analyzed"},
          "opening": {"type": "boolean", "index": "not_analyzed"},
          "status": {"type": "integer", "index": "not_analyzed"}
        }
      }
    }
  }'
```


# Indexing a document
```
curl -XPOST 'http://localhost:9200/fum/shop/1' -d '{
  "name" : "Alo bố nghe",
  "description": "Shop chuyên bán các loại rau thơm củ quả đến từ các vùng miền khác nhau của tổ quốc. Không sạch thì trả lại tiền",
  "seller": {
    "id": 1,
    "fullName": "Hoàng Long"
  },
  "items": [
    {
      "name": "COMBO 1 lạc + 1 bia + 1 đá",
      "description": "Về cơ bản là chán chết"
    },
    {
      "name": "NƯỚC MÍA"
    }
  ],
  "categoryIds": [0,1,2],
  "shipPlaceIds": [1,2,3],
  "opening": true
}'

curl -XPOST 'http://localhost:9200/fum/shop/2' -d '{
  "name" : "Bánh mì Từ Liêm",
  "description": "Chuyên bán mù tạc, phở, rau thơm, bánh mì chảo, tào phớ, củ quả",
  "seller": {
    "id": 2,
    "fullName": "Bá Long"
  },
  "items": [
    {
      "name": "COMBO BÚN ĐẬU THỊT LUỘC MẮM TÔM + NƯỚC CHANH",
      "description": "Ngon tuyệt vời luôn"
    }
  ],
  "categoryIds": [1,2],
  "shipPlaceIds": [1, 3],
  "opening": true
}'


curl -XPOST 'http://localhost:9200/fum/shop/3' -d '{
  "name" : "Rau củ Hà Đông",
  "description": "Ai ăn rau củ không nào? Mười nghìn 1 củ lựu đạn. Chuyên bán củ quả các loại đây.",
  "seller": {
    "id": 3,
    "fullName": "Đỗ Hải Đông"
  },
  "categoryIds": [3,4],
  "shipPlaceIds": [4],
  "opening": false
}'
```


# Searching
```
curl -XGET 'http://127.0.0.1:9200/fum/shop/_search?pretty' -d '{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "type":     "most_fields",
          "query":    "tuyet voi luon",
          "fields": [ 
            "name^2", 
            "name.folded", 
            "description^2", 
            "description.folded", 
            "sellerName^2", 
            "sellerName.folded", 
            "items.name^10",
            "items.name.folded^5", 
            "items.description^10", 
            "items.description.folded^5" ]
        }
      },
      "should": [
        {"term": { "opening": { "value": true }} }
      ]
    }
  }
}'
```
