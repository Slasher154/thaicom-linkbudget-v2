# thaicom-base
Meteor.js Base for Thaicom Application Development
###Cloning Base
`git clone https://github.com/Slasher154/thaicom-base.git <project-name>`

###Enter your app
`cd <project-name>`

###Installing NPM packages
`meteor npm install`

###Starting Thaicom base
`meteor --settings settings.json`

###Dummy Admin
The first username to attempt login to the app will become a dummy admin with a dummy password in the settings.json file. Only first dummy user will bypass Thaicom Authentication server for debug purposes.

##Usage
###Edit settings.json file
Request an API key to authenticate with employee database from MIS team. Put that in the settings file. You can get IP Address by try to login with username different from the dummy admin and observe the error message on the server console. It will show the IP Address.

###Add more pages
This base uses `kadira:flow-router` package to manage routing. Add routes in the `client/routes.js` file. Add more pages in the `client/ui` folder.

###Main template
Edit main template in `client/ui/layout/main-layout.html` to be anything of your choice. The default uses sticky nav-bar & footer from official Bootstrap example.


