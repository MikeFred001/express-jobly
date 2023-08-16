"use strict";

const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError")


let testData;
let testJsToSql;

beforeEach(function (){
  testData = {
    firstName: "newFirstName",
    age: "newAge",
    description: "newDescription"
  };
  testJsToSql = {firstName: "first_name"};
})

describe("sqlForPartialUpdate Function", function () {
  test("Returns expected data", function () {
    expect(sqlForPartialUpdate(testData, testJsToSql)).toEqual({
      setCols: '"first_name"=$1, "age"=$2, "description"=$3',
      values: ['newFirstName', 'newAge', 'newDescription']
    });
  });

  test("Throws error if data object is empty", function () {
    expect(function() {
      sqlForPartialUpdate({}, {})}).toThrow(BadRequestError);
  });
});