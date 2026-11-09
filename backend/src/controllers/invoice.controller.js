const {id} = require('../utils/validation');
class InvoiceController {
  constructor(service, sse) {
    const invoiceId = req => id(req.params.id, 'invoiceId');
    this.create = async (req, res) => res.status(201).json({success: true, data: await service.create(req.body)});
    this.list = async (req, res) => res.json({success: true, ...await service.history(req.query)});
    this.detail = async (req, res) => res.json({success: true, data: await service.detail(invoiceId(req))});
    this.update = async (req, res) => res.json({success: true, data: await service.update(invoiceId(req), req.body)});
    this.addItem = async (req, res) => res.json({success: true, data: await service.mutateItems(invoiceId(req), req.body)});
    this.setQuantity = async (req, res) => res.json({success: true, data: await service.mutateItems(invoiceId(req), {variantId: id(req.params.variantId, 'variantId'), quantity: req.body.quantity}, true)});
    this.cancel = async (req, res) => res.json({success: true, data: await service.cancel(invoiceId(req))});
    this.receipt = async (req, res) => res.json({success: true, data: await service.receipt(invoiceId(req))});
    this.events = async (req, res) => {
      const target = invoiceId(req);
      await service.detail(target); // Return JSON 404 before sending SSE headers.
      res.status(200).set({'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
      res.flushHeaders();
      const remove = sse.add(target, res);
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
      heartbeat.unref();
      res.on('close', () => {clearInterval(heartbeat); remove();});
      try {
        // Subscribe before re-read. A reconnect always gets the committed current state.
        const invoice = await service.detail(target);
        sse.write(res, invoice.status === 'PAID' ? 'PAYMENT_SUCCESS' : 'SNAPSHOT', {invoiceId: target, invoice});
      } catch {res.end();}
    };
  }
}
module.exports = {InvoiceController};
