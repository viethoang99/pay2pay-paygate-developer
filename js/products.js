/**
 * Products Module
 * Quản lý dữ liệu sản phẩm mẫu và render UI theo chuẩn baoyu-design
 */
window.ProductsModule = (function() {
    const products = [
        {
            id: 'sp001',
            nameVi: 'Tai nghe Bluetooth Pro',
            nameEn: 'Bluetooth Headphones Pro',
            price: 890000,
            image: '🎧',
            descVi: 'Tai nghe không dây chống ồn chủ động, pin 30 giờ',
            descEn: 'Active noise cancellation wireless headphones, 30h battery',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        },
        {
            id: 'sp002',
            nameVi: 'Bàn phím cơ RGB',
            nameEn: 'Mechanical RGB Keyboard',
            price: 1290000,
            image: '⌨️',
            descVi: 'Switch cơ học quang học, đèn LED RGB 16.8 triệu màu',
            descEn: 'Optical mechanical switches, 16.8M color RGB backlight',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        },
        {
            id: 'sp003',
            nameVi: 'Chuột gaming không dây',
            nameEn: 'Wireless Gaming Mouse',
            price: 650000,
            image: '🖱️',
            descVi: 'Cảm biến 25.000 DPI siêu nhạy, sạc Type-C pin 70 giờ',
            descEn: 'High-precision 25,000 DPI sensor, 70h rechargeable battery',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        },
        {
            id: 'sp004',
            nameVi: 'Ốp lưng iPhone 15 Pro',
            nameEn: 'iPhone 15 Pro Case',
            price: 250000,
            image: '📱',
            descVi: 'Chất liệu silicon kháng khuẩn cao cấp, chống va đập',
            descEn: 'Premium antimicrobial silicone, military-grade shockproof',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        },
        {
            id: 'sp005',
            nameVi: 'Củ sạc nhanh 65W GaN',
            nameEn: '65W GaN Fast Charger',
            price: 490000,
            image: '🔌',
            descVi: 'Công nghệ GaN III tỏa nhiệt thấp, 2 Type-C + 1 USB-A',
            descEn: 'GaN III technology, 2 USB-C + 1 USB-A multi-port',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        },
        {
            id: 'sp006',
            nameVi: 'Webcam 4K Ultra HDR',
            nameEn: '4K Ultra HDR Webcam',
            price: 1890000,
            image: '📷',
            descVi: 'Độ phân giải 4K 60fps, tự động bắt nét khuôn mặt & mic kép',
            descEn: '4K 60fps resolution, auto face tracking & dual noise-cancelling mics',
            catVi: 'Thiết bị',
            catEn: 'Devices'
        },
        {
            id: 'sp007',
            nameVi: 'Đèn bàn LED thông minh',
            nameEn: 'Smart LED Desk Lamp',
            price: 750000,
            image: '💡',
            descVi: 'Bảo vệ thị lực, tùy chỉnh nhiệt độ màu 2700K - 6500K',
            descEn: 'Eye-friendly flicker-free, adjustable 2700K-6500K color temp',
            catVi: 'Thiết bị',
            catEn: 'Devices'
        },
        {
            id: 'sp008',
            nameVi: 'Bộ chia Hub USB-C 7-in-1',
            nameEn: '7-in-1 USB-C Hub Adapter',
            price: 590000,
            image: '🔗',
            descVi: 'Xuất HDMI 4K 60Hz, sạc PD 100W, khe thẻ SD và USB 3.0',
            descEn: '4K 60Hz HDMI, 100W PD pass-through, SD card & USB 3.0 ports',
            catVi: 'Phụ kiện',
            catEn: 'Accessories'
        }
    ];

    function getById(id) {
        const p = products.find(item => item.id === id);
        if (!p) return null;
        return {
            ...p,
            name: p.nameVi, // backward compatibility
            description: p.descVi,
            category: p.catVi
        };
    }

    function render() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        grid.innerHTML = products.map(product => `
            <div class="product-card group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary-300 transition-all duration-200 flex flex-col overflow-hidden">
                <!-- Visual Container -->
                <div class="h-36 sm:h-40 bg-gradient-to-b from-slate-50 to-slate-100/70 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group-hover:from-primary-50/40 group-hover:to-slate-50 transition-colors">
                    <span class="text-6xl sm:text-7xl transform group-hover:scale-110 transition-transform duration-200 select-none">${product.image}</span>
                    <span class="absolute top-3 left-3 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white/90 backdrop-blur-xs text-primary-700 border border-primary-200/60 shadow-2xs">
                        <span class="lang-vi">${product.catVi}</span>
                        <span class="lang-en">${product.catEn}</span>
                    </span>
                </div>
                
                <!-- Content Area -->
                <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-primary-600 transition-colors">
                            <span class="lang-vi">${product.nameVi}</span>
                            <span class="lang-en">${product.nameEn}</span>
                        </h3>
                        <p class="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            <span class="lang-vi">${product.descVi}</span>
                            <span class="lang-en">${product.descEn}</span>
                        </p>
                    </div>

                    <!-- Bottom Price & CTA -->
                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[10px] text-slate-400 font-medium block">
                                <span class="lang-vi">Đơn giá</span><span class="lang-en">Price</span>
                            </span>
                            <span class="text-sm sm:text-base font-extrabold text-primary-600 font-mono tracking-tight">
                                ${formatCurrency(product.price)}
                            </span>
                        </div>
                        <button onclick="CartModule.addItem('${product.id}')" 
                                class="add-to-cart-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all flex-shrink-0 cursor-pointer">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            <span class="lang-vi">Thêm</span>
                            <span class="lang-en">Add</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    return {
        products,
        getById,
        render
    };
})();
