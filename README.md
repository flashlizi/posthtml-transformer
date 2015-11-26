# posthtml-transfomer

posthtml-transfomer is plugin for [PostHTML](https://github.com/posthtml/posthtml). It process HTML by special directives in node attrs, such as inline scripts and styles, remove useless tags, concat scripts and styles etc.

## Directives

* `ph-inline` - Load `script` and `link` code and make them inline.
* `ph-remove` - Remove tags which specified this directive.
* `ph-concat-start` and `ph-concat-end` - Concat `script` and `link` code.

## Examples

`ph-inline` directive:

``` javascript
// src/lib.js
console.log('hello posthtml-transformer');

// index.html
<script ph-inline src="src/lib.js"></script>

// index.html after transform
<script>
  console.log('hello posthtml-transformer');
</script>
```

`ph-remove` directive:

``` javascript
// index.html
<body>
  <script ph-remove src="src/lib.js"></script>
</body>

// index.html after transform
<body>
</body>
```

`ph-concat-start` and `ph-concat-end` directive:

``` javascript
// src/mod1.js
console.log('mod1');

// src/mod2.js
console.log('mod2');

// src/mod3.js
console.log('mod3');

// index.html
<body>
  <script ph-concat-start src="src/mod1.js"></script>
  <script src="src/mod2.js"></script>
  <script ph-concat-end src="src/mod3.js"></script>
</body>

// index.html after transform
<body>
  <script>
    console.log('mod1');
    console.log('mod2');
    console.log('mod3');
  </script>
</body>
```

## Gulp Usage

Install posthtml-transformer:
```
npm install posthtml-transformer --save-dev
```


``` javascript
var gulp = require('gulp');
var posthtml = require('gulp-posthtml');
var phTransformer = require('posthtml-transformer');

gulp.task('posthtml', function(){
  var plugins = [
    phTransformer({
      minifyJS: true,
      minifyCSS: true
    })
  ];
  return gulp.src('index.html')
    .pipe(posthtml(plugins))
    .on('error', function(err){
      console.error('error:', err);
    })
    .pipe(gulp.dest('./build/'))
});
```

## Options

* `minifyJS` - minify javascript in HTML, default is `true`.
* `minifyCSS` - minify css in HTML, default is `true`.