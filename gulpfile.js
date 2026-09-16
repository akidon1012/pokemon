const
  config = {
    dir : {
      dev: './develop/',
      dist: './html/',
    }
  }

var gulp = require( 'gulp' );
var plumber = require( 'gulp-plumber' );
var notify = require( 'gulp-notify' );
var cache = require('gulp-cached');
var data = require('gulp-data');
var fs = require( 'fs' );
var through = require("through2"); // through2オブジェクトを使用する
var sass = require('gulp-sass')(require('sass'));
var sourcemaps = require('gulp-sourcemaps');
var sassGlob = require( 'gulp-sass-glob' );
var mmq = require( 'gulp-merge-media-queries' );
var cleanCSS = require("gulp-clean-css");
var browserSync = require( 'browser-sync' );
var uglify = require('gulp-uglify');
var imagemin = require( 'gulp-imagemin' );
var imageminPngquant = require( 'imagemin-pngquant' );
var imageminMozjpeg = require( 'imagemin-mozjpeg' );

var postcss = require( 'gulp-postcss' );
var autoprefixer = require( 'autoprefixer' );
var cssdeclsort = require( 'css-declaration-sorter' );
var cssImport = require( 'gulp-cssimport' );
var mqpacker= require( 'css-mqpacker' );

var ejs = require( 'gulp-ejs' );
var rename = require( 'gulp-rename' );
var replace = require( 'gulp-replace' );

var iconfont = require('gulp-iconfont');
var consolidate = require('gulp-consolidate');

var xlsx = require('xlsx');

var clean = require('gulp-clean');

/***************************************************************************
* SASS
***************************************************************************/
var fontOptions = {};
gulp.task("import-fonts", done => {
  gulp.src(config.dir.dev + "css/_fonts_input.scss")
      .pipe(cssImport(fontOptions))
      .pipe( rename('_fonts.scss') )
      .pipe(gulp.dest(config.dir.dev + "css"))
      done();
});

gulp.task('sass', done => {
  gulp.src([config.dir.dev + '**/*.scss'], { base: config.dir.dev})
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass({
      sourceMap: true,
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.dir.dist))
    done();
});


/***************************************************************************
* JS
***************************************************************************/
gulp.task('minjs', done => {
  gulp.src([config.dir.dev + '**/*.js'])
    .pipe( plumber({ errorHandler: notify.onError( 'Error: <%= error.message %>' ) }) )
    .pipe( uglify() )
    .on('error', function(e){
      console.log(e);
    })
    .pipe( gulp.dest( config.dir.dist ) );
    done();
});

gulp.task('minjs-one', done => {
  gulp.src([config.dir.dev + '**/*.js'])
    .pipe( plumber({ errorHandler: notify.onError( 'Error: <%= error.message %>' ) }) )
    .pipe(through.obj((file, enc, callback) => {
      fs.stat(file.path, function (err, stats) {
        // 更新日時が古いファイルは処理しない
        if(file_stats_check(stats)){
          callback(null, file);
          console.log(file.path);
        } else {
          callback(null, null);
        }
      })
    }))
    .pipe( uglify() )
    .on('error', function(e){
      console.log(e);
    })
    .pipe( gulp.dest( config.dir.dist ) );
    done();
});


/***************************************************************************
* 編集日時が10秒以内だとtrueを返す
***************************************************************************/
var file_stats_check = function(stats){
  var elapsed;
  var from = new Date(stats.mtime);
  var to = Date.now();

  // 経過時間をミリ秒で取得
  var ms = to - from;
  // ミリ秒を秒に変換
  elapsed = Math.floor(ms / (1000));

  // console.log('経過時間（秒）',elapsed);
  if(elapsed > 10){
    return false;
  } else {
    return true;
  }
}

/***************************************************************************
* EJS
***************************************************************************/


// gulp.task( "ejs-one", done => {
//   console.log(('gulp ejs start'));

//   // var json = JSON.parse(fs.readFileSync("./develop/data/pagedata.json","utf-8"));

//   gulp.src([config.dir.dev+'**/*.{xhtml,ejs}', '!'+config.dir.dev+'**/_*.{xhtml,ejs}'])
//     .pipe( plumber({ errorHandler: notify.onError( 'Error: <%= error.message %>' ) }) )
//     .pipe(through.obj((file, enc, callback) => {
//       fs.stat(file.path, function (err, stats) {
//         // 更新日時が古いファイルは処理しない
//         if(file_stats_check(stats)){
//           callback(null, file);
//           console.log(file.path);
//         } else {
//           callback(null, null);
//         }
//       })
//     }))
//     .pipe(
//       ejs()
//     )
//     .pipe( replace(/\r\n\r\n/g, '\r\n') )
//     .pipe( replace(/\r\n<!DOCTYPE HTML>/g, '<!DOCTYPE HTML>') )
//     .pipe( rename({ extname: ".html" }) )
//     .pipe( gulp.dest( config.dir.dist ) )
//     done();


gulp.task( "ejs", done => {
  console.log(('gulp ejs start'));

  gulp.src([config.dir.dev+'**/*.{xhtml,ejs}', '!'+config.dir.dev+'**/_*.{xhtml,ejs}'])
    .pipe( plumber({ errorHandler: notify.onError( 'Error: <%= error.message %>' ) }) )
    .pipe(
      ejs()
    )
    .pipe( replace(/\r\n\r\n/g, '\r\n') )
    .pipe( replace(/\r\n<!DOCTYPE HTML>/g, '<!DOCTYPE HTML>') )
    .pipe( rename({ extname: ".html" }) )
    .pipe( gulp.dest( config.dir.dist ) )
    done();
  console.log(('gulp ejs end'));
});


/***************************************************************************
* 画像圧縮
***************************************************************************/
var imageminOption = [
  imageminMozjpeg({
    quality: 70, // 画質
    progressive: true
  }),
  imageminPngquant({
    quality: [.7, .85], // 画質
    speed: 1 // スピード
  })
];

gulp.task( 'imagemin', done => {
  gulp
    .src( config.dir.dev + '**/*.{png,jpg,gif,svg}' )
    .pipe( imagemin( imageminOption ) )
    .pipe( gulp.dest( config.dir.dist ) )
    done();
});

/***************************************************************************
* 無処理ファイルをコピー
***************************************************************************/
gulp.task('copy', function (done) {
  gulp
    .src( [
    config.dir.dev+'**/*.*',
    config.dir.dev+'**/*.*',
    '!'+config.dir.dev+'/**/*.{ejs,xhtml,scss,png,jpg,gif,svg}'
    ] )
    .pipe( gulp.dest( config.dir.dist ) );
    done();
    console.log('file copied');
});

/***************************************************************************
* アイコンフォント
***************************************************************************/
/*
アイコンフォントを更新する際は、
develop\icons\SVG にsvgファイルを格納し、
以下の順にコマンド実行する。
  gulp icon
*/ 

// ファイルを削除
gulp.task( 'clean', function(done) {
  gulp.src('html/', {read: false}).pipe(clean());
  done();
});

const icon_compile_svg_clean = () => {
  return gulp.src('develop/icons/svg_copy/*', {read: false}).pipe(clean())
}

const icon_compile_svg_copy = () => {
  return gulp
    .src( ['develop/icons/SVG/*.svg'] )
    .pipe( gulp.dest( 'develop/icons/svg_copy/' ) )
}

const icon_compile_svg2font = () => {
  var fontName = 'icons';

  return gulp.src( 'develop/icons/svg_copy/*.svg' )
    .pipe( iconfont( { 
      fontName: fontName,
      fontHeight: 1000,
      prependUnicode: true,
      formats: ['ttf', 'eot', 'woff'],
      normalize: true
    } ) )
    .on('glyphs', function(glyphs) {
      
      var options = {
        className: 'icon',
        fontName:  fontName,
        fontPath: '../iconfont/',
        glyphs: glyphs.map(function(glyph) {
          // this line is needed because gulp-iconfont has changed the api from 2.0
          return { name: glyph.name, codepoint: glyph.unicode[0].charCodeAt(0) }
        }),
      };

      // CSS
      gulp.src( 'develop/icons/templates/iconfont.css' )
        .pipe( consolidate( 'lodash', options ) )
        .pipe( rename( { basename: '_'+'iconfont' , extname: '.scss' } ) )
        .pipe( gulp.dest('develop/matchup/css'))

      console.log('icon_compile CSS');

      // フォント一覧 HTML
      gulp.src( 'develop/icons/templates/iconfont.html' )
        .pipe( consolidate( 'lodash', options ) )
        .pipe( gulp.dest('develop'))

      console.log('icon_compile フォント一覧 HTML');
    })
    .pipe( gulp.dest('develop/matchup/iconfont') )
}
const icon_compile_html = () => {
  return gulp.src([config.dir.dev+'iconfont.html'])
    .pipe( plumber({ errorHandler: notify.onError( 'Error: <%= error.message %>' ) }) )
    .pipe( replace(/\r\n\r\n/g, '\r\n') )
    .pipe( replace(/\r\n<!DOCTYPE HTML>/g, '<!DOCTYPE HTML>') )
    .pipe( rename({ extname: ".html" }) )
    .pipe( gulp.dest( config.dir.dist ) )
}

exports.icon = gulp.series(
  icon_compile_svg_clean,
  icon_compile_svg_copy,
  icon_compile_svg2font,
  icon_compile_html,
  'copy', 'sass', 'ejs'
);



/***************************************************************************
* ローカルサーバー
***************************************************************************/
gulp.task('build-server', function (done) {
  browserSync.init({
      server: {
          baseDir: "./html/"
      }
  });
  done();
  console.log('Server was launched');
});

gulp.task('browser-reload', function (done){
  browserSync.reload();
  done();
  console.log('Browser reload completed');
});

exports.compile = gulp.series(
  'copy', 'sass', 'ejs', 'imagemin'
);


gulp.task('watch', function(done) {
  gulp.watch(config.dir.dev + '**/*.{png,jpg,gif,svg,js,json}', gulp.task('copy'));
  gulp.watch(config.dir.dev + '**/*.scss', gulp.task('sass'));
  // gulp.watch(config.dir.dev + '**/*.js', gulp.task('minjs-one'));
  gulp.watch([config.dir.dev+'**/*.{xhtml,ejs}', '!'+config.dir.dev+'**/_*.{xhtml,ejs}'], gulp.task('ejs'));
  gulp.watch([config.dir.dev+'**/common/*.{xhtml,ejs}'], gulp.task('ejs'));
  gulp.watch(config.dir.dev + '**/*.{png,jpg,gif,svg}', gulp.task('imagemin'));
  // gulp.watch(config.dir.dev + 'data/pagedata.xlsx', gulp.task('json'));
  // gulp.watch(config.dir.dev + '**/*.ejs', gulp.task('browser-reload'));
  // gulp.watch('./html/**/css/*.css', gulp.task('browser-reload'));
  // gulp.watch('./html/**/js/*.js', gulp.task('browser-reload'));
  // gulp.watch('develop/icons/*.svg', gulp.task('icon'));
  done();
  console.log(('gulp watch started'));
});

// タスクの実行
gulp.task('default', gulp.series('build-server', 'watch', function(done){
  done();
  console.log('Default all task done!');
}));
