const { src, dest } = require('gulp');
const mininfyJs = require('gulp-uglify');
const minifyCss = require('gulp-clean-css');
const minifyHtml = require('gulp-minify-html');
const rename = require('gulp-rename');

const bundleJs = () => {
    console.log('bundling js file(s) to /dist/js/ folder');
    return src('./src/js/**/*.js')
        .pipe(mininfyJs())
        // .pipe(rename({ extname: '.min.js' }))
        .pipe(dest('./dist/js'));
};


const bundleCss = () => {
    console.log('bundling css file(s) to /dist/styles/ folder');
    return src('./src/styles/**/*.css')
        .pipe(minifyCss())
        // .pipe(rename({ extname: '.min.css' }))
        .pipe(dest('./dist/styles'));
};

const bundleHtml = () => {
    console.log('bundling html file to /dist/ folder');
    return src('./src/*.html')
        .pipe(minifyHtml())
        // .pipe(rename({ extname: '.min.html' }))
        .pipe(dest('./dist/'));
};

exports.bundleJs = bundleJs;
exports.bundleCss = bundleCss;
exports.bundleHtml = bundleHtml;