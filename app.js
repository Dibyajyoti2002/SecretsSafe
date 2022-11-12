//jshint esversion:6
require("dotenv").config()
const express=require("express");
const bodyParser = require("body-parser");
const ejs=require("ejs")
const mongoose=require("mongoose")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require('mongoose-findorcreate')


const app=express()

console.log(process.env.SECRET);

app.use(express.static("public"))
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized:false

}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true});


const userSchema =new mongoose.Schema({
    email:String,
    password:String,
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
  
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/register",function(req,res){
    res.render("register");
})

/*Basic authentication
app.post("/register",function(req,res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email:req.body.username,
            password:hash
        })
        newUser.save(function(err){
            if(!err){
                res.render("secrets");
            }
            else{
                console.log(err)
            }
        })
        
    });

})*/

app.get("/secrets",function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets")
    }
    else{
        res.redirect("/login")
    }
})


app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){console.log(err)}
        else{
            res.redirect("/")
        }
    })
})


app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit")
    }
    else{
        res.redirect("/login")
    }

})



app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err, user) {
        if (err) { 
            console.log(err)
            res.redirect("/register")
         }
         else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
         }
          
        });
      });


/*Basic authentication
app.post("/login",function(req,res){
    const username=req.body.username
    const password=req.body.password
    User.findOne({email:username},function(err,foundUser){
        if(!err){
            if(foundUser){
                res.render("secrets")
            }
        }
        else{
            console.log(err)
        }
    })

})*/


app.post("/login",function(req,res){
    const newUser = new User({
        username:req.body.username,
        password:req.body.password
    })
    req.login(newUser,function(err){
        if(err){
            console.log(err)
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
        })
    }
})
})


app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret
    console.log(req.user)
    res.redirect("/secrets")
})










app.listen(3000,function(req,res){
    console.log("Server is listening on port 3000");
})