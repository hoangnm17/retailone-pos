import React, { memo, useState } from "react";
import ProductUnitModal from "./ProductUnitModal";
import ProductCard from "components/pos/Product/ProductCard";

const ProductList = ({ products = [], onSelect, disabled }) => {
  const [targetProduct, setTargetProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleCardClick = (product, hasMultipleUnits) => {
    if (hasMultipleUnits) {
      setTargetProduct(product);
      setShowModal(true);
    } else {
      const singleUnit = product.units[0];
      onSelect(product, singleUnit);
    }
  };

  const handleSelectUnit = (product, unit) => {
    onSelect(product, unit);
    setShowModal(false);
  };

  return (
    <div className="product-card-grid">
      {products.map((product) => (
        <div key={product.id}><ProductCard
          product={product}
          onSelect={handleCardClick}
          disabled={disabled}
        /><button className="btn btn-link text-decoration-none product-detail-trigger px-1" aria-label={`Chi tiết ${product.name}`} onClick={() => {setTargetProduct(product); setShowModal(true);}}>Chi tiết / Đơn vị tính</button></div>
      ))}

      <ProductUnitModal
        show={showModal}
        product={products.find(product => product.id === targetProduct?.id) || targetProduct}
        onHide={() => setShowModal(false)}
        onSelectUnit={handleSelectUnit}
        disabled={disabled}
      />
    </div>
  );
};

export default memo(ProductList);
