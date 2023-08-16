"use strict";

const { BadRequestError } = require("../expressError");

/** Takes two objects:
 *  dataToUpdate: Containins all data to be updated
 *  {name: "newName", description: "newDescription", ...}
 *
 *  jsToSql: Contains javascript keys, mapped to corresponding sql column names
 *  {firstName: "first_name", lastName: "last_name", ...}
 *
 *  Returns an object containing the columns that need to be updated as a string
 *  of SET commands and an array of the values belonging to dataToUpdate
 *
 * {
 *   setCols: "first_name=$1, last_name=$2",
 *   values: ["New First Name", "New Last Name"]
 * }
 *
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // console.log("DATA>>>>", dataToUpdate, "JStoSQL>>>>", jsToSql);
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  // console.log("COLUMNS>>>>", cols);
  // console.log("VALUES>>>>", Object.values(dataToUpdate));

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
