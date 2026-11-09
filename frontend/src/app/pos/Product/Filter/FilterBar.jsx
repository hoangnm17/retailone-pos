import {useEffect, useRef, useState} from 'react';

export default function FilterBar({keyword, onKeywordChange, categories, selectedCategory, onSelectCategory, addItem, preventFocus, disabled}) {
  const inputRef = useRef(null);
  const [catPage, setCatPage] = useState(0);
  const catsPerPage = 4;
  const totalCatPages = Math.ceil(categories.length / catsPerPage);
  useEffect(() => {
    const focus = () => {if (!preventFocus && !window.isModalOpen) inputRef.current?.focus();};
    const shortcut = event => {if (event.key === 'F4' && !window.isModalOpen) {event.preventDefault(); focus();}};
    window.addEventListener('RE_FOCUS_SEARCH', focus); window.addEventListener('keydown', shortcut); focus();
    return () => {window.removeEventListener('RE_FOCUS_SEARCH', focus); window.removeEventListener('keydown', shortcut);};
  }, [preventFocus]);
  return <div className="filter-bar-container w-100">
    <div className="search-wrapper mb-3"><form className="input-group shadow-sm rounded-pill overflow-hidden border bg-white" onSubmit={event => {event.preventDefault(); if (!disabled && keyword.trim()) addItem(keyword);}}><span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search text-primary"/></span><input ref={inputRef} type="text" className="form-control border-0 py-2" placeholder="Tìm tên hoặc mã vạch..." aria-label="Tìm tên hoặc mã vạch" value={keyword} onChange={event => onKeywordChange(event.target.value)}/><button type="submit" disabled={disabled || !keyword.trim()} className="btn btn-white border-0 px-3 text-primary" aria-label="Thêm theo mã vạch"><i className="bi bi-upc-scan"/></button></form></div>
    <div className="d-flex align-items-center gap-2 mb-3"><button className="btn btn-sm btn-outline-primary rounded-circle" aria-label="Danh mục trước" disabled={catPage === 0} onClick={() => setCatPage(page => page - 1)}><i className="bi bi-chevron-left"/></button><div className="d-flex gap-2 flex-grow-1 justify-content-center flex-wrap">
      <button className={`btn btn-sm rounded-pill px-3 fw-bold ${!selectedCategory ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onSelectCategory(null)}>TẤT CẢ</button>
      {categories.slice(catPage * catsPerPage, (catPage + 1) * catsPerPage).map(category => <button key={category.id} className={`btn btn-sm rounded-pill px-3 text-uppercase fw-bold ${selectedCategory?.id === category.id ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onSelectCategory(category)}>{category.name}</button>)}
    </div><button className="btn btn-sm btn-outline-primary rounded-circle" aria-label="Danh mục sau" disabled={catPage >= totalCatPages - 1} onClick={() => setCatPage(page => page + 1)}><i className="bi bi-chevron-right"/></button></div>
  </div>;
}
