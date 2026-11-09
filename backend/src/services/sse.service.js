class SseService {
  constructor() {this.clients = new Map();}
  add(invoiceId, res) {
    const clients = this.clients.get(invoiceId) || new Set(); clients.add(res); this.clients.set(invoiceId, clients);
    return () => {clients.delete(res); if (!clients.size) this.clients.delete(invoiceId);};
  }
  write(res, type, data) {res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);}
  publish(invoiceId, type, data) {
    for (const res of this.clients.get(invoiceId) || []) {
      try {this.write(res, type, data);} catch {this.clients.get(invoiceId)?.delete(res);}
    }
  }
  close() {for (const clients of this.clients.values()) for (const res of clients) res.end(); this.clients.clear();}
}
module.exports = {SseService};
