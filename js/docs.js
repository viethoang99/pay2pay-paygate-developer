/**
 * Documentation Module
 * Nội dung tài liệu tích hợp cổng thanh toán PayGate
 */
window.DocsModule = (function() {
    // Store documentation content for each tab
    const docs = {};

    // ==================== TAB: OVERVIEW ====================
    docs.overview = `
        <h1>Tổng quan về PayGate</h1>
        <p>PayGate là cổng thanh toán trực tuyến cho phép merchant (đơn vị bán hàng) tích hợp nhanh chóng các phương thức thanh toán phổ biến tại Việt Nam vào website và ứng dụng.</p>
        
        <h2>Phương thức thanh toán hỗ trợ</h2>
        <table>
            <thead>
                <tr><th>Phương thức</th><th>Mô tả</th><th>Thời gian xử lý</th></tr>
            </thead>
            <tbody>
                <tr><td>Thẻ ATM nội địa</td><td>Hỗ trợ 40+ ngân hàng Việt Nam</td><td>Realtime</td></tr>
                <tr><td>Visa / Mastercard / JCB</td><td>Thẻ quốc tế, hỗ trợ 3D Secure</td><td>Realtime</td></tr>
                <tr><td>Ví điện tử</td><td>MoMo, ZaloPay, VNPay, ShopeePay</td><td>Realtime</td></tr>
                <tr><td>QR Code</td><td>VietQR - quét mã từ mọi ứng dụng ngân hàng</td><td>Realtime</td></tr>
                <tr><td>Chuyển khoản</td><td>Chuyển khoản ngân hàng tự động đối soát</td><td>1-5 phút</td></tr>
                <tr><td>Trả góp</td><td>Trả góp 0% qua thẻ tín dụng, 3-12 tháng</td><td>Realtime</td></tr>
            </tbody>
        </table>

        <h2>Quy trình thanh toán</h2>
        <div class="bg-gray-50 rounded-xl p-6 my-6">
            <div class="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm">
                <div class="flex items-center gap-2"><span class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span><span>Khách chọn hàng & bấm Thanh toán</span></div>
                <span class="hidden md:block text-gray-400">→</span>
                <div class="flex items-center gap-2"><span class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span><span>Merchant gọi API tạo Payment Link</span></div>
                <span class="hidden md:block text-gray-400">→</span>
                <div class="flex items-center gap-2"><span class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span><span>Redirect khách đến trang PayGate</span></div>
                <span class="hidden md:block text-gray-400">→</span>
                <div class="flex items-center gap-2"><span class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span><span>Khách thanh toán</span></div>
                <span class="hidden md:block text-gray-400">→</span>
                <div class="flex items-center gap-2"><span class="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs">5</span><span>PayGate gửi Webhook + Redirect</span></div>
            </div>
        </div>

        <h2>Môi trường</h2>
        <table>
            <thead>
                <tr><th>Môi trường</th><th>Base URL</th><th>Mô tả</th></tr>
            </thead>
            <tbody>
                <tr><td><code>Sandbox</code></td><td><code>https://sandbox.api.paygate.vn/v1</code></td><td>Môi trường test, không phát sinh giao dịch thật</td></tr>
                <tr><td><code>Production</code></td><td><code>https://api.paygate.vn/v1</code></td><td>Môi trường thật, giao dịch thật</td></tr>
            </tbody>
        </table>
    `;

    // ==================== TAB: QUICKSTART ====================
    docs.quickstart = `
        <h1>Bắt đầu nhanh</h1>
        <p>Hướng dẫn từng bước để tích hợp PayGate vào website của bạn trong 30 phút.</p>

        <h2>Bước 1: Đăng ký tài khoản Merchant</h2>
        <ol>
            <li>Truy cập <code>https://dashboard.paygate.vn/register</code></li>
            <li>Điền thông tin doanh nghiệp và xác minh email</li>
            <li>Tải lên giấy phép kinh doanh (nếu là doanh nghiệp)</li>
            <li>Chờ duyệt tài khoản (thường trong 1-2 ngày làm việc)</li>
        </ol>

        <h2>Bước 2: Lấy API Key</h2>
        <p>Sau khi tài khoản được duyệt, vào <strong>Dashboard → Cài đặt → API Keys</strong> để lấy:</p>
        <table>
            <thead><tr><th>Loại Key</th><th>Prefix</th><th>Mục đích</th></tr></thead>
            <tbody>
                <tr><td>Test Key</td><td><code>pk_test_</code></td><td>Dùng cho môi trường Sandbox</td></tr>
                <tr><td>Live Key</td><td><code>pk_live_</code></td><td>Dùng cho môi trường Production</td></tr>
                <tr><td>Secret Key</td><td><code>sk_test_ / sk_live_</code></td><td>Dùng để verify webhook signature</td></tr>
            </tbody>
        </table>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p class="text-amber-800 font-medium">⚠️ Lưu ý bảo mật</p>
            <p class="text-amber-700 text-sm mt-1">Không bao giờ để Secret Key trong code frontend. Chỉ sử dụng Secret Key ở backend server.</p>
        </div>

        <h2>Bước 3: Tạo Payment Link đầu tiên</h2>
        <p>Gửi request POST để tạo link thanh toán:</p>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-bash">curl -X POST https://sandbox.api.paygate.vn/v1/create-payment \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pk_test_your_api_key" \\
  -d '{
    "orderId": "ORDER-001",
    "amount": 100000,
    "description": "Test thanh toán",
    "returnUrl": "https://yoursite.com/payment/success",
    "cancelUrl": "https://yoursite.com/payment/cancel"
  }'</code></pre></div>

        <h2>Bước 4: Xử lý Response</h2>
        <p>Nếu thành công, API trả về payment link:</p>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-json">{
  "success": true,
  "data": {
    "paymentLink": "https://pay.paygate.vn/checkout/TXN20260828001",
    "transactionId": "TXN20260828001",
    "orderId": "ORDER-001",
    "amount": 100000,
    "expiredAt": "2026-08-28T11:00:00Z"
  }
}</code></pre></div>
        <p>Redirect khách hàng đến <code>paymentLink</code> hoặc mở trong tab mới.</p>

        <h2>Bước 5: Cấu hình Webhook</h2>
        <p>Vào <strong>Dashboard → Webhook</strong> để đăng ký URL nhận callback. Xem chi tiết tại tab <a href="#" onclick="DocsModule.switchTab('webhook');return false;" class="text-primary-600 hover:underline">Webhook / IPN</a>.</p>
    `;

    // ==================== TAB: API REFERENCE ====================
    docs.api = `
        <h1>API Reference</h1>
        <p>Tài liệu chi tiết tất cả API endpoints của PayGate.</p>

        <h2>Authentication</h2>
        <p>Tất cả API request đều yêu cầu header <code>Authorization</code>:</p>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-bash">Authorization: Bearer {API_KEY}</code></pre></div>

        <hr/>

        <h2>POST /create-payment</h2>
        <p>Tạo một liên kết thanh toán mới.</p>

        <h3>Request Body</h3>
        <table>
            <thead><tr><th>Field</th><th>Type</th><th>Bắt buộc</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>orderId</code></td><td>string</td><td>✅</td><td>Mã đơn hàng unique, tối đa 50 ký tự</td></tr>
                <tr><td><code>amount</code></td><td>integer</td><td>✅</td><td>Số tiền thanh toán (VND), tối thiểu 10,000</td></tr>
                <tr><td><code>description</code></td><td>string</td><td>✅</td><td>Mô tả đơn hàng, tối đa 255 ký tự</td></tr>
                <tr><td><code>returnUrl</code></td><td>string</td><td>✅</td><td>URL redirect sau khi thanh toán thành công</td></tr>
                <tr><td><code>cancelUrl</code></td><td>string</td><td>❌</td><td>URL redirect khi khách hủy thanh toán</td></tr>
                <tr><td><code>currency</code></td><td>string</td><td>❌</td><td>Mã tiền tệ, mặc định: <code>VND</code></td></tr>
                <tr><td><code>items</code></td><td>array</td><td>❌</td><td>Danh sách sản phẩm</td></tr>
                <tr><td><code>customerInfo</code></td><td>object</td><td>❌</td><td>Thông tin khách hàng (name, email, phone)</td></tr>
                <tr><td><code>metadata</code></td><td>object</td><td>❌</td><td>Dữ liệu tùy chỉnh, trả về trong webhook</td></tr>
                <tr><td><code>expiredAt</code></td><td>integer</td><td>❌</td><td>Thời gian hết hạn (phút), mặc định: 15</td></tr>
            </tbody>
        </table>

        <h3>Items Object</h3>
        <table>
            <thead><tr><th>Field</th><th>Type</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>name</code></td><td>string</td><td>Tên sản phẩm</td></tr>
                <tr><td><code>quantity</code></td><td>integer</td><td>Số lượng</td></tr>
                <tr><td><code>price</code></td><td>integer</td><td>Đơn giá (VND)</td></tr>
            </tbody>
        </table>

        <h3>Response - Success (200)</h3>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-json">{
  "success": true,
  "data": {
    "paymentLink": "https://pay.paygate.vn/checkout/TXN...",
    "transactionId": "TXN20260828001",
    "orderId": "YOUR-ORDER-ID",
    "amount": 500000,
    "currency": "VND",
    "status": "PENDING",
    "expiredAt": "2026-08-28T11:00:00Z",
    "createdAt": "2026-08-28T10:45:00Z"
  }
}</code></pre></div>

        <h3>Response - Error (4xx)</h3>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-json">{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Số tiền thanh toán không hợp lệ. Tối thiểu 10,000 VND."
  }
}</code></pre></div>

        <hr/>

        <h2>GET /transactions/{transactionId}</h2>
        <p>Truy vấn trạng thái giao dịch.</p>
        <h3>Response</h3>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-json">{
  "success": true,
  "data": {
    "transactionId": "TXN20260828001",
    "orderId": "ORDER-001",
    "amount": 500000,
    "status": "SUCCESS",
    "paymentMethod": "ATM_CARD",
    "bankCode": "VCB",
    "paidAt": "2026-08-28T10:50:00Z"
  }
}</code></pre></div>

        <h3>Trạng thái giao dịch</h3>
        <table>
            <thead><tr><th>Status</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>PENDING</code></td><td>Chờ thanh toán</td></tr>
                <tr><td><code>SUCCESS</code></td><td>Thanh toán thành công</td></tr>
                <tr><td><code>FAILED</code></td><td>Thanh toán thất bại</td></tr>
                <tr><td><code>CANCELLED</code></td><td>Khách hủy thanh toán</td></tr>
                <tr><td><code>EXPIRED</code></td><td>Hết hạn thanh toán</td></tr>
                <tr><td><code>REFUNDED</code></td><td>Đã hoàn tiền</td></tr>
            </tbody>
        </table>

        <hr/>

        <h2>POST /refund</h2>
        <p>Hoàn tiền giao dịch (toàn phần hoặc một phần).</p>
        <h3>Request Body</h3>
        <table>
            <thead><tr><th>Field</th><th>Type</th><th>Bắt buộc</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>transactionId</code></td><td>string</td><td>✅</td><td>Mã giao dịch cần hoàn</td></tr>
                <tr><td><code>amount</code></td><td>integer</td><td>✅</td><td>Số tiền hoàn (≤ số tiền giao dịch gốc)</td></tr>
                <tr><td><code>reason</code></td><td>string</td><td>❌</td><td>Lý do hoàn tiền</td></tr>
            </tbody>
        </table>
    `;

    // ==================== TAB: WEBHOOK ====================
    docs.webhook = `
        <h1>Webhook / IPN</h1>
        <p>Webhook cho phép PayGate gửi thông báo tự động đến server của bạn khi trạng thái giao dịch thay đổi.</p>

        <h2>Cấu hình Webhook</h2>
        <ol>
            <li>Đăng nhập <strong>Dashboard → Cài đặt → Webhook</strong></li>
            <li>Nhập URL endpoint của bạn (phải là HTTPS)</li>
            <li>Chọn các events cần nhận thông báo</li>
            <li>Copy <strong>Webhook Secret</strong> để verify signature</li>
        </ol>

        <h2>Webhook Events</h2>
        <table>
            <thead><tr><th>Event</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>payment.success</code></td><td>Thanh toán thành công</td></tr>
                <tr><td><code>payment.failed</code></td><td>Thanh toán thất bại</td></tr>
                <tr><td><code>payment.cancelled</code></td><td>Khách hủy thanh toán</td></tr>
                <tr><td><code>payment.expired</code></td><td>Hết hạn thanh toán</td></tr>
                <tr><td><code>refund.success</code></td><td>Hoàn tiền thành công</td></tr>
                <tr><td><code>refund.failed</code></td><td>Hoàn tiền thất bại</td></tr>
            </tbody>
        </table>

        <h2>Webhook Payload</h2>
        <p>PayGate gửi <code>POST</code> request với body JSON:</p>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-json">{
  "event": "payment.success",
  "timestamp": "2026-08-28T10:50:00Z",
  "data": {
    "transactionId": "TXN20260828001",
    "orderId": "ORDER-001",
    "amount": 500000,
    "currency": "VND",
    "status": "SUCCESS",
    "paymentMethod": "ATM_CARD",
    "bankCode": "VCB",
    "paidAt": "2026-08-28T10:50:00Z",
    "metadata": {}
  }
}</code></pre></div>

        <h2>Verify Signature</h2>
        <p>Mỗi webhook request đều có header <code>X-PayGate-Signature</code> chứa chữ ký HMAC-SHA256. Bạn <strong>phải</strong> verify signature để đảm bảo request đến từ PayGate.</p>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-javascript">const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}</code></pre></div>

        <h2>Xử lý Webhook</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-javascript">// Express.js example
app.post('/webhook/paygate', express.json(), (req, res) => {
    const signature = req.headers['x-paygate-signature'];
    
    // 1. Verify signature
    if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 2. Xử lý theo event type
    const { event, data } = req.body;
    
    switch (event) {
        case 'payment.success':
            // Cập nhật đơn hàng trong database
            await updateOrderStatus(data.orderId, 'PAID');
            break;
        case 'payment.failed':
            await updateOrderStatus(data.orderId, 'PAYMENT_FAILED');
            break;
    }
    
    // 3. Trả về 200 OK
    res.status(200).json({ received: true });
});</code></pre></div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <p class="text-blue-800 font-medium">💡 Best Practices</p>
            <ul class="text-blue-700 text-sm mt-2 space-y-1">
                <li>• Luôn verify signature trước khi xử lý webhook</li>
                <li>• Trả về HTTP 200 trong vòng 5 giây</li>
                <li>• Xử lý bất đồng bộ nếu logic phức tạp</li>
                <li>• Implement idempotency - webhook có thể được gửi lại</li>
                <li>• PayGate sẽ retry tối đa 5 lần nếu không nhận được 200</li>
            </ul>
        </div>
    `;

    // ==================== TAB: SDK ====================
    docs.sdk = `
        <h1>SDK & Code Mẫu</h1>
        <p>Code mẫu tích hợp PayGate cho các ngôn ngữ/framework phổ biến.</p>

        <h2>Node.js / Express</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-javascript">const express = require('express');
const fetch = require('node-fetch');

const PAYGATE_API_URL = 'https://api.paygate.vn/v1';
const API_KEY = process.env.PAYGATE_API_KEY;

const app = express();
app.use(express.json());

// Tạo payment link
app.post('/api/checkout', async (req, res) => {
    try {
        const { orderId, amount, items } = req.body;

        const response = await fetch(PAYGATE_API_URL + '/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY,
            },
            body: JSON.stringify({
                orderId,
                amount,
                description: 'Thanh toán đơn hàng ' + orderId,
                returnUrl: 'https://yoursite.com/success',
                cancelUrl: 'https://yoursite.com/cancel',
                items,
            }),
        });

        const data = await response.json();
        
        if (data.success) {
            res.json({ paymentLink: data.data.paymentLink });
        } else {
            res.status(400).json({ error: data.error.message });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(3000);</code></pre></div>

        <h2>Python / Flask</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-python">import requests
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

PAYGATE_API_URL = 'https://api.paygate.vn/v1'
API_KEY = os.environ.get('PAYGATE_API_KEY')

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.get_json()
    
    response = requests.post(
        f'{PAYGATE_API_URL}/create-payment',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}',
        },
        json={
            'orderId': data['orderId'],
            'amount': data['amount'],
            'description': f'Thanh toán đơn hàng {data["orderId"]}',
            'returnUrl': 'https://yoursite.com/success',
            'cancelUrl': 'https://yoursite.com/cancel',
            'items': data.get('items', []),
        }
    )
    
    result = response.json()
    
    if result.get('success'):
        return jsonify({'paymentLink': result['data']['paymentLink']})
    else:
        return jsonify({'error': result['error']['message']}), 400

if __name__ == '__main__':
    app.run(port=3000)</code></pre></div>

        <h2>PHP / Laravel</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-php">&lt;?php
// routes/api.php
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;

Route::post('/checkout', function (Request $request) {
    $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . config('services.paygate.api_key'),
    ])->post('https://api.paygate.vn/v1/create-payment', [
        'orderId'     => $request->orderId,
        'amount'      => $request->amount,
        'description' => "Thanh toán đơn hàng {$request->orderId}",
        'returnUrl'   => route('payment.success'),
        'cancelUrl'   => route('payment.cancel'),
        'items'       => $request->items ?? [],
    ]);

    $data = $response->json();

    if ($data['success'] ?? false) {
        return response()->json([
            'paymentLink' => $data['data']['paymentLink']
        ]);
    }

    return response()->json([
        'error' => $data['error']['message'] ?? 'Unknown error'
    ], 400);
});</code></pre></div>

        <h2>cURL</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-bash">curl -X POST https://api.paygate.vn/v1/create-payment \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pk_live_your_api_key" \\
  -d '{
    "orderId": "ORDER-20260828-001",
    "amount": 500000,
    "description": "Thanh toán đơn hàng",
    "returnUrl": "https://yoursite.com/success",
    "cancelUrl": "https://yoursite.com/cancel",
    "items": [
      { "name": "Sản phẩm A", "quantity": 2, "price": 150000 },
      { "name": "Sản phẩm B", "quantity": 1, "price": 200000 }
    ]
  }'</code></pre></div>
    `;

    // ==================== TAB: FAQ ====================
    docs.faq = `
        <h1>Câu hỏi thường gặp (FAQ)</h1>

        <div class="space-y-6">
            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Phí dịch vụ của PayGate là bao nhiêu?</h3>
                <p class="text-gray-600 mt-2">Phí giao dịch từ 1.1% - 2.5% tùy phương thức thanh toán. Không phí cài đặt, không phí duy trì hàng tháng. Xem bảng phí chi tiết tại Dashboard.</p>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Thời gian nhận tiền về tài khoản?</h3>
                <p class="text-gray-600 mt-2">Tiền được chuyển vào tài khoản ngân hàng của merchant trong T+1 (ngày làm việc tiếp theo). Có thể đăng ký nhận tiền theo ngày hoặc theo tuần.</p>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Payment link có thời hạn bao lâu?</h3>
                <p class="text-gray-600 mt-2">Mặc định 15 phút. Có thể cấu hình từ 5 phút đến 24 giờ thông qua tham số <code>expiredAt</code> khi tạo payment.</p>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Làm sao để test thanh toán ở môi trường Sandbox?</h3>
                <p class="text-gray-600 mt-2">Dùng API key có prefix <code>pk_test_</code> và base URL <code>sandbox.api.paygate.vn</code>. Bạn có thể dùng thẻ test:</p>
                <ul class="text-gray-600 mt-2 ml-4 space-y-1">
                    <li>• Thẻ thành công: <code>4111 1111 1111 1111</code></li>
                    <li>• Thẻ thất bại: <code>4000 0000 0000 0002</code></li>
                    <li>• Thẻ hết hạn: <code>4000 0000 0000 0069</code></li>
                </ul>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">PayGate hỗ trợ giao dịch quốc tế không?</h3>
                <p class="text-gray-600 mt-2">Có. PayGate hỗ trợ thẻ Visa, Mastercard, JCB, American Express quốc tế. Giao dịch được quy đổi sang VND theo tỷ giá ngân hàng.</p>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Có hỗ trợ hoàn tiền (refund) không?</h3>
                <p class="text-gray-600 mt-2">Có. Hỗ trợ hoàn tiền toàn phần hoặc một phần qua API <code>POST /refund</code> hoặc qua Dashboard. Thời gian hoàn tiền 3-7 ngày làm việc tùy phương thức.</p>
            </div>

            <div class="border border-gray-200 rounded-xl p-5">
                <h3 class="font-semibold text-gray-900">Rate limit của API là bao nhiêu?</h3>
                <p class="text-gray-600 mt-2">Sandbox: 100 requests/phút. Production: 1000 requests/phút. Nếu cần limit cao hơn, liên hệ support.</p>
            </div>
        </div>
    `;

    // ==================== TAB: ERRORS ====================
    docs.errors = `
        <h1>Mã lỗi (Error Codes)</h1>
        <p>Danh sách tất cả mã lỗi có thể trả về từ API PayGate.</p>

        <h2>HTTP Status Codes</h2>
        <table>
            <thead><tr><th>Status</th><th>Mô tả</th></tr></thead>
            <tbody>
                <tr><td><code>200</code></td><td>Thành công</td></tr>
                <tr><td><code>400</code></td><td>Request không hợp lệ (thiếu field, sai format)</td></tr>
                <tr><td><code>401</code></td><td>Không xác thực (API key sai hoặc hết hạn)</td></tr>
                <tr><td><code>403</code></td><td>Không có quyền truy cập</td></tr>
                <tr><td><code>404</code></td><td>Không tìm thấy resource</td></tr>
                <tr><td><code>409</code></td><td>Conflict (orderId đã tồn tại)</td></tr>
                <tr><td><code>429</code></td><td>Rate limit exceeded</td></tr>
                <tr><td><code>500</code></td><td>Lỗi server nội bộ</td></tr>
            </tbody>
        </table>

        <h2>Business Error Codes</h2>
        <table>
            <thead><tr><th>Code</th><th>Message</th><th>Giải pháp</th></tr></thead>
            <tbody>
                <tr><td><code>INVALID_AMOUNT</code></td><td>Số tiền không hợp lệ</td><td>Kiểm tra amount >= 10,000 VND và là số nguyên</td></tr>
                <tr><td><code>INVALID_ORDER_ID</code></td><td>Mã đơn hàng không hợp lệ</td><td>orderId phải là string, tối đa 50 ký tự, không chứa ký tự đặc biệt</td></tr>
                <tr><td><code>DUPLICATE_ORDER</code></td><td>Mã đơn hàng đã tồn tại</td><td>Sử dụng orderId mới cho mỗi giao dịch</td></tr>
                <tr><td><code>INVALID_URL</code></td><td>URL không hợp lệ</td><td>returnUrl và cancelUrl phải là HTTPS URL hợp lệ</td></tr>
                <tr><td><code>MERCHANT_INACTIVE</code></td><td>Tài khoản merchant bị khóa</td><td>Liên hệ support@paygate.vn</td></tr>
                <tr><td><code>INSUFFICIENT_BALANCE</code></td><td>Không đủ số dư (cho refund)</td><td>Nạp thêm số dư hoặc chờ settlement</td></tr>
                <tr><td><code>TRANSACTION_NOT_FOUND</code></td><td>Không tìm thấy giao dịch</td><td>Kiểm tra lại transactionId</td></tr>
                <tr><td><code>REFUND_EXCEEDED</code></td><td>Số tiền hoàn vượt quá giao dịch gốc</td><td>Tổng refund không được vượt quá amount giao dịch</td></tr>
                <tr><td><code>RATE_LIMIT</code></td><td>Vượt quá giới hạn request</td><td>Giảm tần suất gọi API hoặc liên hệ nâng limit</td></tr>
            </tbody>
        </table>

        <h2>Ví dụ xử lý lỗi</h2>
        <div class="code-block-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-javascript">try {
    const response = await fetch(API_URL + '/create-payment', {
        method: 'POST',
        headers: { ... },
        body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!result.success) {
        switch (result.error.code) {
            case 'INVALID_AMOUNT':
                console.error('Số tiền không hợp lệ:', result.error.message);
                break;
            case 'DUPLICATE_ORDER':
                console.error('Đơn hàng đã tồn tại, tạo orderId mới');
                break;
            case 'RATE_LIMIT':
                console.error('Quá nhiều request, thử lại sau');
                await delay(5000);
                break;
            default:
                console.error('Lỗi:', result.error.message);
        }
    }
} catch (networkError) {
    console.error('Lỗi kết nối:', networkError.message);
}</code></pre></div>
    `;

    // ==================== MODULE FUNCTIONS ====================
    
    let currentTab = 'overview';

    function switchTab(tabId) {
        if (!docs[tabId]) return;
        currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.doc-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Render content
        const content = document.getElementById('doc-content');
        if (content) {
            content.innerHTML = docs[tabId];
            // Re-highlight code blocks
            content.querySelectorAll('pre code').forEach(block => {
                Prism.highlightElement(block);
            });
        }
    }

    function init() {
        // Bind tab click events
        document.querySelectorAll('.doc-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.tab);
            });
        });

        // Show default tab
        switchTab('overview');
    }

    return {
        init,
        switchTab
    };
})();

/**
 * Helper: Copy code to clipboard
 */
window.copyCode = function(btn) {
    const codeBlock = btn.parentElement.querySelector('code');
    if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.textContent).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.color = '#22c55e';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.color = '';
            }, 2000);
        });
    }
};
