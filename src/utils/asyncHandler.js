// Bọc handler async để lỗi được chuyển vào error middleware.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
