const {id} = require('../utils/validation');
class PaymentController {
  constructor(service) {
    this.pay = async (req, res) => res.json({success: true, data: await service.pay(id(req.params.id, 'invoiceId'), req.body)});
    this.mockConfirm = async (req, res) => res.json({success: true, data: await service.mockConfirm(id(req.params.id, 'invoiceId'))});
    this.webhook = async (req, res) => res.json({success: true, data: await service.confirm(req.body)});
  }
}
module.exports = {PaymentController};
