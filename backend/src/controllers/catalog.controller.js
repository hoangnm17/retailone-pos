class CatalogController {
  constructor(service) {
    this.context = async (req, res) => res.json({success: true, data: await service.context()});
    this.list = async (req, res) => res.json({success: true, data: await service.list(req.query)});
  }
}
module.exports = {CatalogController};
