const path = require('path')
const fastify = require('fastify')()

fastify.register(require('fastify-normalize-request-reply'))

fastify.register(require('point-of-view'), {
  engine : {
    nunjucks : require('nunjucks'),
  },
  templates : path.join(__dirname, './', 'views')
})

fastify.register(require('fastify-formbody'))

const responseTime = require('express-response-time')

fastify.use(responseTime((methond, url, time) => {
  console.log(`>>>>>>>>>> ${methond} ${url} ${time}ms`);
}))

const passport = require('passport')
const Strategy = require('passport-local').Strategy

const secret = 'eeeek'

// the single user record that is hard
// coded in for the sake of this simple example
const user = {
  username : 'foo',
  id : 0,
  password : '123',
}

fastify.use(require('express-session')({
  name : 'site_cookie',
  secret : secret,
  resave : false,
  saveUninitialized : false,
  cookie : {
    // make session cookies only last 15 seconds
    // for the sake of this demo
    maxAge : 15000,
  },
}))

// using the local strategy with passport
passport.use(new Strategy({
  // options for passport local - using custom field names
  usernameField : 'user',
  passwordField : 'pass',
},

// login method
function (username, password, cb) {
  if (username === user.username && password.toString() === user.password) {
    return cb(null, user)
  }

  // null and false for all other cases
  return cb(null, false)
}))

passport.serializeUser(function (user, cb) {
  cb(null, user.id)
})

passport.deserializeUser(function (id, cb) {
  cb(null, user)
})

fastify.use(passport.initialize()) // Used to initialize passport
fastify.use(passport.session()) // Used to persist login session

fastify.get('/', (req, reply) => {
  reply.view('home.njk', {
    title: 'Home',
    user: req.user
  })
})

fastify.get('/login', (req, reply) => {
  reply.view('login.njk', {
    title: 'Login',
    user: req.user
  })
})

fastify.route({
  method: 'POST',
  url: '/login',
  preHandler: (req, reply, done) => {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return done(err) }
      if (!user) { return reply.redirect('/login') }
      req.logIn(user, function(err) {
        if (err) { return done(err) }
        return reply.redirect('/')
      })
    })(req, reply, done)
  },
  handler: (req, reply) => {
    reply.redirect('/login')
  }
})

fastify.get('/logout', (req, reply) => {
  req.logout()
  reply.redirect('/')
})

fastify.listen(8080, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})