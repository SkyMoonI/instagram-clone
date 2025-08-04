/**
 * This function takes an object and a list of allowed fields as input, and returns a new object that only contains the allowed fields.
 * @param {Object} obj - The object to filter.
 * @param  {...String} allowedFields - The list of allowed field names.
 * @returns {Object} - The filtered object.
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

module.exports = filterObj;
