var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');
var UglifyJS = require('uglify-js');
var CleanCSS = require('clean-css');

var transformOptions = {};

function initOptions(options){
  options = options || {};
  options.root = options.root || './';
  options.encoding = options.encoding || 'utf-8';
  options.minifyJS = options.minifyJS === undefined ? true : !!options.minifyJS;
  options.minifyCSS = options.minifyCSS === undefined ? true : !!options.minifyCSS;
  transformOptions = options;
  return options;
}

function transformer(options){
  options = initOptions(options);

  return function transform(tree, callback){
    var completed = false, tasks = 0;
    function done(isTaskDone){
      if(isTaskDone) tasks--;
      if(!tasks && completed){
        callback(null, tree);
      }
    }

    var removeLineFlag = false;
    var concatFlag = false, concatContent = '';

    tree.walk(function(node){
      if(removeLineFlag && node === '\n'){
        removeLineFlag = false;
        return '';
      }

      var attrs = node.attrs;
      if(!attrs) return node;

      if(attrs.hasOwnProperty('ph-remove')){
        removeLineFlag = true;
        return {tag:false, content:''};
      }

      if(attrs.hasOwnProperty('ph-inline')){
        var src, content;
        if(node.tag === 'script'){
          tasks++;
          readFileContent(attrs.src, function(data){
            setNodeContent(node, data);
            delete attrs['ph-inline'];
            delete attrs['src'];
            delete attrs['type'];
            done(true);
          });
        }else if(node.tag === 'link'){
          tasks++;
          readFileContent(attrs.href, function(data){
            node.tag = 'style';
            setNodeContent(node, data);
            delete attrs['ph-inline'];
            delete attrs['rel'];
            delete attrs['href'];
            delete attrs['type'];
            done(true);
          });
        }
        return node;
      }

      if(concatFlag || attrs.hasOwnProperty('ph-concat-start')){
        concatFlag = true;
        var src = attrs.src || attrs.href;
        concatContent += '\n' + fs.readFileSync(path.resolve(options.root, src), options.encoding);
        
        if(attrs.hasOwnProperty('ph-concat-end')){
          concatFlag = false;
          if(concatContent.charAt(concatContent.length - 1) !== '\n'){
            concatContent += '\n';
          }
          if(node.tag === 'script'){
            var needMinify = transformOptions.minifyJS || attrs.hasOwnProperty('ph-minify');
            concatContent = needMinify ? minifyJS(concatContent) : concatContent;
            return {tag:'script', content:concatContent};
          }else if(node.tag === 'link'){
            var needMinify = transformOptions.minifyCSS || attrs.hasOwnProperty('ph-minify');
            concatContent = needMinify ? minifyCSS(concatContent) : concatContent;
            return {tag:'style', content:concatContent};
          }
        }else{
          removeLineFlag = true;
          return {tag:false, content:''};
        }
      }

      if(node.tag === 'script' || node.tag === 'style'){
        if(node.content){
          setNodeContent(node, node.content.toString());
        }
      }

      return node;
    });
    
    completed = true;
    done();
    return tree;
  };
};

function readFileContent(src, options){
  options = typeof options === 'function' ? {callback:options} : (options || {});
  options.encoding = options.encoding || 'utf-8';
  var matched = src.match(/^((http|https):)?\/\/([\s\S]+)$/);

  if(matched){
    if(matched[1] === undefined) src = 'http:' + src;
    var requestOptions = url.parse(src);
    requestOptions.headers = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4',
    };
    var request = http.get(requestOptions, function(respose){
      var content = '';
      respose.setEncoding('utf8');
      respose.on('data', function(chunk){
        content += chunk;
      });
      respose.on('end', function(){
        options.callback && options.callback(content);
      });
    }).on('error', function(err){
      console.log('error:', err);
    });
  }else{
    var content = fs.readFileSync(path.resolve('./', src), options.encoding);
    options.callback && options.callback(content);
  }
}

function setNodeContent(node, content){
  var needMinify = node.attrs && node.attrs.hasOwnProperty('ph-minify');
  if(needMinify) delete node.attrs['ph-minify'];

  if(node.tag === 'script' && (transformOptions.minifyJS || needMinify)){
    node.content = minifyJS(content);
  }else if(node.tag === 'style' && (transformOptions.minifyCSS || needMinify)){
    node.content = minifyCSS(content);
  }else{
    node.content = content;
  }
}

function minifyJS(js){
  var code = UglifyJS.minify(js, {fromString:true}).code;
  return code;
}

function minifyCSS(css){
  var code = new CleanCSS({advanced:false}).minify(css).styles;
  return code;
}

transformer.match = function(expression, callback){
  return function(tree){
    tree.match(expression, callback);
  }
};

transformer.walk = function(callback){
  return function(tree){
    tree.walk(callback);
  }
};

module.exports = transformer;