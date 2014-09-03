var express = require('express')
	, app = express()
	, nunjucks = require('nunjucks')
	, fs = require('fs')
	, path = require('path')
	, junk = require('junk')
	, path = require('path')
	, moment = require('moment')
	, Paginator = require('paginator')
	, md = require('meta-marked')
	, config = require('./config.json')
	, paginator = new Paginator(config.settings.articlesPerPage,config.settings.pagerLinks)
	, IMAGE_DIR = '/images';

/**
 * Get file extension
 * Utility method to get the extension of a given file
 **/
function getExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

var faviconFix = function(req, res, next){
	if(req.params.type === 'favicon.ico'){
		res.send(200);
	}else{
		next();
	}
}

/**
 * Article archive
 * Generates an archive object. All content by year.
 **/
var getArchive = function(callback){

	var archive = new Object();

	//get all posts
	loadPosts({}, function(data){

		var posts = data.results;

		posts.forEach(function(result){

			var year = moment(result.meta.date).format("YYYY");
			
			//Have we got the year already?
			if(!archive[year]){

				archive[year] = {
					posts: new Array()
				};

			//If we have add the post to the array
			}else{

				if(archive[year].posts.indexOf(result.meta.title) == -1){
					archive[year].posts.push(result);
				}

			}

		});

		callback(archive);

	});
}

/**
 * Directory walker
 * Finds all files with a given extension in a directory structure 
 **/
var walk = function(dir, extension, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    
    if (err) return done(err);
    
    var pending = list.length;
    
    if (!pending) return done(null, results);
    
    list.forEach(function(file) {
      file = dir + '/' + file;
      
      fs.stat(file, function(err, stat) {
        
        if (stat && stat.isDirectory()) {
          
          walk(file, extension, function(err, res) {

          	if(getExtension(res) == extension){
          		results = results.concat(res);
          	}

            if (!--pending) done(null, results);
          
          });

        } else {
          
          if(getExtension(file) == extension){
          	results.push(file);
          }

          if (!--pending) done(null, results);
        }
      
      });
    });
  });
};

/**
 * Takes an options object containing...
 * contentType: type of posts to load
 * tag: filter results by tag
 * order: ASC
 * pageNumber: paginates the results, supply the required page number. Leave empty for all.
 * ... and returns a list of posts ordered by date (ASC by default)
 **/
var loadPosts = function(options, callback){

	var dir;

	if(options.hasOwnProperty('contentType')){
		if(options.contentType){
			dir = __dirname+'/content/'+options.contentType;
		}
	}else{
		dir = __dirname+'/content';
	}

	var posts = new Array();

	walk(dir, 'md', function(err, files){

		//Read each index.md file to get the metadata
		files.forEach(function(file){

			var post = createPostFromFile(file, options);

			//Add the post to the results
			if(options.hasOwnProperty('tag')){
				if(post.meta.tags.indexOf(options.tag) != -1){
					posts.push(post);
				}
			}else{
				posts.push(post);
			}

		});

		posts.sort(function(a,b){
			return new Date(b.meta.date) - new Date(a.meta.date);
		});

		if(options.pageNumber){

			var pager = paginator.build(posts.length,options.pageNumber);

			if(posts.length > config.settings.articlesPerPage){
				posts = posts.slice(pager.first_result,pager.last_result);
			}

			var contentType = options.contentType ? options.contentType : null;

			callback({pager:pager, results:posts, contentType:contentType});

		//or if we don't, just send everything
		}else{
			callback({results:posts});
		}
	});
}

var createPostFromFile = function(file, options){
	//Create a post object
	var post = md(fs.readFileSync(file, "utf8"));	
	var components = file.split(path.sep);
	
	components.pop();
	components = components.slice(components.length - 2);
	
	var articleDir = components.join('/');
	post.meta.url = articleDir;
	post.meta.featureImage = "/images/"+post.meta.featureImage;

	if(options){
		post.contentType = options.contentType ? options.contentType : null;
	} 
	return post;
}

nunjucks.configure('views', {
  autoescape: true,
  express   : app
});

//Set up the static content directories for client side assets
app.use('/static',express.static(__dirname + '/static'));
app.use('/images',express.static(__dirname + IMAGE_DIR));

/**
 * Home
 * Load the homepage. Can be specified in the config file
 **/
app.get('/', faviconFix, function(req, res){
	
	loadPosts({pageNumber: 1}, function(data){
		var page = pageObject();
		page.posts = data.results;
		page.pager = data.page;
		res.render('list.html', page);
	});

});

app.get('/archives/:year', function(req, res){

	getArchive(function(archive){

		var page = pageObject();
		var year = req.params.year;

		if(archive[year]){
			page.posts = archive[req.params.year].posts;
		}else{
			page.posts = null;
		}
		
		res.render(config.templates.listview,page);

	});

});

/**
 * RSS feeds by type
 * Creates an RSS feed of all content for a given type
 **/
app.get('/feeds/:type', function(req, res){
	var options = { 
		contentType: req.params.type,
		pageNumber: req.query.page
	}
	loadPosts(options, function(data){
		res.contentType("application/rss+xml");
		res.render('feed.html', {
			name: config.locals.name,
			url: config.locals.url,
			description: config.locals.description,
    		posts : data.results
  		});
	});
});

/**
 * Get all content by tag
 * Loads a paginated list of content by tag
 **/
app.get('/tags/:tag', faviconFix, function(req, res){
	loadPosts({pageNumber: req.query.page, tag: req.params.tag}, function(data){
		var page = pageObject();
		page.posts = data.results;
		page.pager = data.page;
		res.render('list.html',page);
	});
});

/**
 * Get all content by type
 * Loads a paginated list of all content in one of the content/ sub directories
 **/
app.get('/:type', faviconFix, function(req, res){
	
	loadPosts({contentType: req.params.type, pageNumber: req.query.page,limit: req.query.limit}, function(data){
		
		var page = pageObject();
		page.posts = data.results;
		page.pager = data.pager;
		page.contentType = data.contentType;

		if(req.params.type === 'directory'){

			res.render(config.templates.directory,page);

		}else{

			res.render(config.templates.listview,page);
		
		}

	});

});

/**
 * Get Entry detail
 * Loads a single article and renders it using the template specified in the articles markdown
 **/
app.get('/:type/:entry', faviconFix, function(req, res){
	
	var dir = __dirname+'/content/'+req.params.type+'/'+req.params.entry;

	fs.readdir(dir, function(err, files){

		if(err || !files){
			res.send(404);
		}else{

			files = files.filter(junk.not);

			for(var file in files){

				if(getExtension(files[file]) === 'md'){

					var file = dir+'/'+files[file];

					var post = createPostFromFile(file);

					var page = pageObject();
					page.post = post;
					res.render(post.meta.template, page);

				}
			}

		}
	
	});
});

var pageObject = function(){
	return config.page;
}

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var server = app.listen(server_port, server_ip_address, function() {
    console.log('Listening on port %d', server.address().port);
});