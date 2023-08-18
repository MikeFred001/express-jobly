"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^[Bb]earer /, "").trim();

    try {
      res.locals.user = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      /* ignore invalid tokens (but don't store user!) */
    }
  }
  return next();

}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  if (res.locals.user?.username) return next();
  throw new UnauthorizedError();
}

/** Middleware to ensure that the logged in user is an Admin
 * Throws error if user is not an admin, otherwise moves to next function.
 */

function isAdmin(req, res, next) {
  if (res.locals.user?.isAdmin !== true) throw new UnauthorizedError();

  return next();
}


/** Middleware to ensure that the logged in user is either an Admin or an
 * authorized user.
 * Throws error if user is not an admin, otherwise moves to next function.
 */

function isAdminOrCurrentUser(req, res, next) {
  const localUser = res.locals.user;
  const user = req.params;

  if (localUser === undefined) throw new UnauthorizedError();
  if (localUser.username !== user.username && localUser.isAdmin !== true) {
    throw new UnauthorizedError();
  }

  return next();
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  isAdmin,
  isAdminOrCurrentUser
};




  // console.log("LOCAL USER>>>>>>", localUser);
  // console.log("USER>>>>>>", user);
  // console.log("ISADMIN>>>>>", localUser.isAdmin);
  // console.log("RES LOCAL USER>>>>>", res.locals.user);
  // console.log("REQ PARAMS>>>>>", req.params);
