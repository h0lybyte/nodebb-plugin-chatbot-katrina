(function(module) {
    'use strict';

    var User = module.parent.require('./user'),
        Topics = module.parent.require('./topics'),
        Categories = module.parent.require('./categories'),
        meta = module.parent.require('./meta'),
        db = module.parent.require('../src/database'),
        //fs = module.parent.require('fs'),
        path = module.parent.require('path'),
        nconf = module.parent.require('nconf'),
        winston = module.parent.require('winston'),
        async = module.parent.require('async'),
        CleverBot = require('cleverbot-node'),
        katrina = null,
       // SlackClient = require('slack-node'),
      //  slack = null,

        constants = Object.freeze({
            name : 'katrina',
            admin: {
                icon  : 'fa-female',
                route : '/plugins/katrina',
                label : 'Katrina'
            }
        });
    
    var Katrina = {
            config: {
                'webhookURL': '',
                'channel': '',
                'post:maxlength': '',
                'slack:categories': ''
            }
        };

    Katrina.init = function(app, middleware, controllers, callback) {
        function render(req, res, next) {
            res.render('admin/plugins/katrina', {});
        }

        var router;

        if(app.router) {
          callback = middleware;
          controllers = app.controllers;
          middleware = app.middleware;
          router = app.router;
        } else {
          router = app;
        }
    
        router.get('/admin/plugins/katrina', middleware.admin.buildHeader, render);
        router.get('/api/admin/plugins/katrina', render);

        meta.settings.get('katrina', function(err, settings) {
            for(var prop in Katrina.config) {
                if (settings.hasOwnProperty(prop)) {
                    Katrina.config[prop] = settings[prop];
                }
            }

            katrina = new CleverBot();
          //  katrina.setWebhook(CleverBot.config['webhookURL']); // Might have just remove that
        });

        callback();
    },

    Katrina.messageParse = function(post) {
        var content = post.content;
        
        async.parallel({
            user: function(callback) {
                User.getUserFields(post.uid, ['username', 'picture'], callback);  
            },
            topic: function(callback) {
                Topics.getTopicFields(post.tid, ['title', 'slug'], callback);
            },
            category: function(callback) {
                Categories.getCategoryFields(post.cid, ['name'], callback);
            }
        }, function(err, data) {
            var categories = JSON.stringify(Slack.config['slack:categories']) || false;
            
            if (!categories || categories.hasOwnProperty(post.cid)) {
                // trim message based on config option
                var maxContentLength = Slack.config['post:maxlength'] || false;
                if (maxContentLength && content.length > maxContentLength) { content = content.substring(0, maxContentLength) + '...'; }
                // message format: <username> posted [<categoryname> : <topicname>]\n <message>
                var message = '<' + nconf.get('url') + '/topic/' + data.topic.slug + '|[' + data.category.name + ': ' + data.topic.title + ']>\n' + content;
                
                slack.webhook({
                    'text'     : message,
                    'channel'  : (Slack.config['channel'] || '#general'),
                    'username' : data.user.username,
                    'icon_url' : data.user.picture.match(/^\/\//) ? 'http:' + data.user.picture : data.user.picture
                }, function(err, response) {
                    console.log(response);
                });
            }
        });
    },

    Slack.adminMenu = function(headers, callback) {
        headers.plugins.push({
            'route' : constants.admin.route,
            'icon'  : constants.admin.icon,
            'name'  : constants.admin.label
        });
        callback(null, headers);
    }

    module.exports = Slack;
    
}(module));