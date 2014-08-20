module.exports = function(grunt) {
  grunt.initConfig({
    compass: {
      dev: {
        options: {
          sassDir: 'static/scss',
          cssDir: 'static/css',
          environment: 'development'
        }
      }
    },
    watch: {
      sass: {
        files: [
          'static/scss/**/*.scss'
        ],
        tasks: [
          'compass:dev'
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compass');

  grunt.registerTask('default', ['compass:dev']);
  
};

