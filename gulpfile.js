const gulp = require('gulp');
const dartSass = require('sass');
const gulpSass = require('gulp-sass')(dartSass);
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const browserSync = require('browser-sync').create();
const gulpIf = require('gulp-if');
const replace = require('gulp-replace');

const isProduction = process.env.NODE_ENV === 'production';

const paths = {
  styles: {
    src: 'styles/**/*.scss',
    dest: 'dist/css'
  },
  scripts: {
    src: 'js/**/*.js',
    dest: 'dist/js'
  },
  images: {
    src: 'images/**/*',
    dest: 'dist/images'
  },
  sprite: {
    src: './sprite.svg',
    dest: 'dist'
  },
  pages: {
    src: ['pages/**/*.html', 'index.html'],
    dest: 'dist'
  }
};

// Compile and minify SCSS
async function styles() {
  const autoprefixer = (await import('gulp-autoprefixer')).default;

  return gulp.src(paths.styles.src)
    .pipe(gulpSass({ outputStyle: 'compressed' }).on('error', gulpSass.logError))
    .pipe(autoprefixer({
      overrideBrowserslist: ['last 2 versions'], // Adjust according to your project requirements
      cascade: false
    }))
    .pipe(gulpIf(isProduction, cleanCSS()))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(browserSync.stream()); // Stream changes to BrowserSync
}

// Minify JavaScript
function scripts() {
  return gulp.src(paths.scripts.src)
    .pipe(uglify())
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.stream()); // Stream changes to BrowserSync
}

// Copy sprite.svg to dist
function sprite() {
  return gulp.src(paths.sprite.src)
    .pipe(gulp.dest(paths.sprite.dest)); // Copy sprite.svg to dist folder
}

// Optimize images
async function images() {
  const imagemin = (await import('gulp-imagemin')).default;
  return gulp.src(paths.images.src)
    .pipe(gulpIf(isProduction, imagemin())) // Optimize images if in production mode
    .pipe(gulp.dest(paths.images.dest))
    .pipe(browserSync.stream()); // Stream changes to BrowserSync
}

// Minify HTML and update paths for CSS files
async function pages() {
  const htmlmin = (await import('gulp-htmlmin')).default;

  return gulp.src(paths.pages.src, { base: './' })
    .pipe(replace(/xlink:href="\.\//g, 'xlink:href="./')) // Fix paths for SVG sprites
    .pipe(replace(/href="(\.\/|\.\.\/)styles\/([^"]+)"/g, (match, prefix, cssFile) => {
      if (prefix === '../') {
        return `href="../css/${cssFile}"`; // Adjust CSS paths for production build
      } else {
        return `href="./css/${cssFile}"`; // Adjust CSS paths for development build
      }
    }))
    .pipe(gulpIf(isProduction, htmlmin({ collapseWhitespace: true }))) // Minify HTML if in production mode
    .pipe(gulp.dest(paths.pages.dest))
    .pipe(browserSync.stream()); // Stream changes to BrowserSync
}

// Watch files for changes
function watch() {
  browserSync.init({
    server: {
      baseDir: './dist' // Serve files from the dist folder
    },
    startPath: '/index.html', // Start with index.html
    middleware: [
      function (req, res, next) {
        if (req.url.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css'); // Set correct MIME type for CSS files
        }
        next();
      }
    ]
  });

  // Watch tasks for changes
  gulp.watch(paths.styles.src, styles); // Watch SCSS files
  gulp.watch(paths.scripts.src, scripts); // Watch JS files
  gulp.watch(paths.images.src, images); // Watch image files
  gulp.watch(paths.sprite.src, sprite); // Watch sprite.svg file
  gulp.watch(paths.pages.src, pages).on('change', browserSync.reload); // Watch HTML files
}

// Define complex tasks
const build = gulp.series(gulp.parallel(styles, scripts, images, sprite, pages)); // Build task for production
const dev = gulp.series(build, watch); // Development task with watch mode

// Export tasks
exports.styles = styles;
exports.scripts = scripts;
exports.images = images;
exports.sprite = sprite;
exports.pages = pages;
exports.watch = watch;
exports.build = build;
exports.default = dev;
