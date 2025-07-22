class APIFeatures {
  // query is a mongoose query, queryString is an express query string
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    // we want to replace gte, gt, lte, lt with $gte, $gt, $lte, $lt. Because mongoose doesn't support these
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // we need to give the query as an object not a string
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // sort('price ratingAverage') this is from the query string
      const sortBy = this.queryString.sort.split(',').join(' '); // this is for the same sorting values.
      this.query = this.query.sort(sortBy);
      // console.log(sortBy);
    } else {
      // this is a default sorting if no sort is given. -createdAt means sort by createdAt in descending order
      // so the most recent tour will be first
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    const sensitiveFields = ['password', 'ssn', 'secret'];
    // if (this.queryString.fields) {
    //   const fields = this.queryString.fields.split(',').join(' ');
    //   this.query = this.query.select(fields);
    // } else {
    //   this.query = this.query.select('-__v'); // exclude the __v field
    // }

    if (this.queryString.fields) {
      const fieldsStr = this.queryString.fields
        .split(',')
        .filter((field) => !sensitiveFields.includes(field.trim()))
        .join(' ');
      this.query = this.query.select(fieldsStr);
    } else {
      this.query = this.query.select('-__v'); // exclude the __v field
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // page=2&limit=10, 1-10 page 1, 11-20 page 2, etc
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
