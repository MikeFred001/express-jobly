"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  isAdmin,
  isAuthorized
} = require("./auth");


const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");

function next(err) {
  if (err) throw new Error("Got error from middleware");
}


describe("authenticateJWT", function () {
  test("works: via header", function () {
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    const req = {};
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});


describe("ensureLoggedIn", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureLoggedIn(req, res, next))
        .toThrow(UnauthorizedError);
  });

  test("unauth if no valid login", function () {
    const req = {};
    const res = { locals: { user: { } } };
    expect(() => ensureLoggedIn(req, res, next))
        .toThrow(UnauthorizedError);
  });
});


/********************************** isAdmin **********************************/

describe("isAdmin function", function () {

  test("works for admins", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: true } } };

    isAdmin(req, res, next);
  });

  test("throws error if not admin", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };

    expect(() => isAdmin(req, res, next))
        .toThrow(UnauthorizedError);
  });

  test("unauth for anon user", function () {
    const req = {};
    const res = { locals: {} };

    expect(() => isAdmin(req, res, next))
        .toThrow(UnauthorizedError);
  });
});


describe("isAuthorized function", function () {

  test("works for admins", function () {
    const req = { params: { username: "testuser" } };
    const res = { locals: { user: { username: "admin", isAdmin: true } } };

    isAuthorized(req, res, next);
  });

  test("works for authorized users", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "test", isAdmin: false } } };

    isAuthorized(req, res, next);
  });

  test("fails if not authorized users", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "wrong", isAdmin: false } } };

    expect(() => isAuthorized(req, res, next))
        .toThrow(UnauthorizedError);
  });

  test("unauth for anon user", function () {
    const req = { params: { username: "testuser"} };
    const res = { locals: {} };

    expect(() => isAuthorized(req, res, next))
        .toThrow(UnauthorizedError);
  });
});