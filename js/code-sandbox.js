/**
 * Interactive Code Sandbox Module
 * Hỗ trợ hiển thị code mẫu đa ngôn ngữ (cURL, Node.js, PHP, Python)
 * cho 5 API cốt lõi của Pay2Pay
 */
window.CodeSandboxModule = (function() {
    const apiData = {
        'webhook': {
            titleVi: 'Nhận Webhook thông báo giao dịch (IPN)',
            titleEn: 'Receive Transaction Webhook (IPN)',
            descVi: 'Endpoint của bạn nhận HTTP POST từ Pay2Pay khi có giao dịch thành công. Phản hồi 200 OK với success=true.',
            descEn: 'Your endpoint receives HTTP POST from Pay2Pay upon successful payment. Respond with 200 OK and success=true.',
            endpoint: 'POST https://your-domain.com/ipn_url',
            snippets: {
                'curl': `# Mô phỏng Webhook Payload mà Pay2Pay POST tới hệ thống của bạn
curl -X POST "https://your-domain.com/ipn_url" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "SUCCESS",
    "message": "Thành công.",
    "data": {
      "orderId": "ORD_1720000000",
      "txnId": "TXN_9823412",
      "amount": 450000,
      "status": "PAID",
      "paymentMethod": "VIETQR",
      "bankCode": "MB",
      "transactionDate": "2026-09-24 10:30:00",
      "signature": "UNJDNul1ErQrci6RrNXfW..."
    }
  }'`,
                'node': `// Express.js Webhook Receiver Handler
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

app.post('/ipn_url', (req, res) => {
  const { code, data } = req.body;
  
  if (code === 'SUCCESS' && data.status === 'PAID') {
    console.log(\`Đơn hàng \${data.orderId} đã thanh toán \${data.amount} VND qua \${data.paymentMethod}\`);
    // 1. Kiểm tra chữ ký RSA-2048 bằng Public Key của Pay2Pay
    // 2. Cập nhật trạng thái đơn hàng trong Database
    // 3. Phản hồi thành công cho Pay2Pay
    return res.status(200).json({ code: 'SUCCESS', message: 'IPN received successfully' });
  }

  res.status(400).json({ code: 'FAIL', message: 'Payment not completed' });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));`,
                'php': `<?php
// PHP Webhook Receiver Handler
$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if ($data && $data['code'] === 'SUCCESS' && $data['data']['status'] === 'PAID') {
    $orderId = $data['data']['orderId'];
    $amount  = $data['data']['amount'];
    
    // 1. Xác thực chữ ký số RSA-2048 bằng Pay2Pay Public Key
    // 2. Cập nhật trạng thái đơn hàng vào CSDL
    
    header('Content-Type: application/json');
    echo json_encode(['code' => 'SUCCESS', 'message' => 'IPN Processed']);
    exit;
}

http_response_code(400);
echo json_encode(['code' => 'FAIL', 'message' => 'Invalid webhook']);
?>`,
                'python': `# FastAPI / Flask Webhook Handler
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/ipn_url', methods=['POST'])
def receive_ipn():
    payload = request.get_json()
    if payload.get("code") == "SUCCESS" and payload.get("data", {}).get("status") == "PAID":
        order_id = payload["data"]["orderId"]
        amount = payload["data"]["amount"]
        # 1. Xác minh chữ ký số SHA256withRSA
        # 2. Xử lý gạch nợ đơn hàng
        return jsonify({"code": "SUCCESS", "message": "OK"}), 200
        
    return jsonify({"code": "FAIL"}), 400

if __name__ == '__main__':
    app.run(port=3000)`
            }
        },

        'init': {
            titleVi: 'Khởi tạo thanh toán (Redirectlink INIT)',
            titleEn: 'Initialize Payment (Redirectlink INIT)',
            descVi: 'Tạo link thanh toán để điều hướng khách hàng sang cổng thanh toán bảo mật Pay2Pay.',
            descEn: 'Generate payment link to redirect customer to Pay2Pay secure payment page.',
            endpoint: 'POST https://sandbox.pay2pay.vn/api/v2/payment/init',
            snippets: {
                'curl': `curl -X POST "https://sandbox.pay2pay.vn/api/v2/payment/init" \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "p-client-id: MERCHANT-WEB" \\
  -H "p-signature: <RSA_Signature>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORD_1720000000",
    "amount": 450000,
    "currency": "VND",
    "orderInfo": "Thanh toan don hang ORD_1720000000",
    "returnUrl": "https://your-domain.com/payment-result",
    "ipnUrl": "https://your-domain.com/ipn_url"
  }'`,
                'node': `const axios = require('axios');

async function createPayment() {
  const payload = {
    orderId: "ORD_" + Date.now(),
    amount: 450000,
    currency: "VND",
    orderInfo: "Thanh toan don hang demo",
    returnUrl: "https://your-domain.com/payment-result",
    ipnUrl: "https://your-domain.com/ipn_url"
  };

  const response = await axios.post("https://sandbox.pay2pay.vn/api/v2/payment/init", payload, {
    headers: {
      "Authorization": "Bearer <accessToken>",
      "p-client-id": "MERCHANT-WEB",
      "p-signature": "<RSA_Signature>",
      "Content-Type": "application/json"
    }
  });

  console.log("Redirect URL:", response.data.data.paymentUrl);
  return response.data.data.paymentUrl;
}`,
                'php': `<?php
$payload = [
    'orderId'   => 'ORD_' . time(),
    'amount'    => 450000,
    'currency'  => 'VND',
    'orderInfo' => 'Thanh toan don hang demo',
    'returnUrl' => 'https://your-domain.com/payment-result',
    'ipnUrl'    => 'https://your-domain.com/ipn_url'
];

$ch = curl_init('https://sandbox.pay2pay.vn/api/v2/payment/init');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer <accessToken>',
    'p-client-id: MERCHANT-WEB',
    'p-signature: <RSA_Signature>',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
echo "Payment URL: " . $result['data']['paymentUrl'];
?>`,
                'python': `import requests, time

payload = {
    "orderId": f"ORD_{int(time.time())}",
    "amount": 450000,
    "currency": "VND",
    "orderInfo": "Thanh toan don hang demo",
    "returnUrl": "https://your-domain.com/payment-result",
    "ipnUrl": "https://your-domain.com/ipn_url"
}

headers = {
    "Authorization": "Bearer <accessToken>",
    "p-client-id": "MERCHANT-WEB",
    "p-signature": "<RSA_Signature>",
    "Content-Type": "application/json"
}

res = requests.post("https://sandbox.pay2pay.vn/api/v2/payment/init", json=payload, headers=headers)
print("Payment URL:", res.json()["data"]["paymentUrl"])`
            }
        },

        'check': {
            titleVi: 'Truy vấn trạng thái giao dịch (Check Status)',
            titleEn: 'Query Transaction Status (Check Status)',
            descVi: 'Chủ động tra cứu trạng thái đơn hàng khi khách hàng quay lại ReturnUrl.',
            descEn: 'Actively query order status when customer is redirected back to ReturnUrl.',
            endpoint: 'POST https://sandbox.pay2pay.vn/api/v2/payment/check-status',
            snippets: {
                'curl': `curl -X POST "https://sandbox.pay2pay.vn/api/v2/payment/check-status" \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "p-client-id: MERCHANT-WEB" \\
  -H "p-signature: <RSA_Signature>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORD_1720000000",
    "txnId": "TXN_9823412"
  }'`,
                'node': `const axios = require('axios');

async function checkOrderStatus(orderId, txnId) {
  const res = await axios.post("https://sandbox.pay2pay.vn/api/v2/payment/check-status", {
    orderId,
    txnId
  }, {
    headers: {
      "Authorization": "Bearer <accessToken>",
      "p-client-id": "MERCHANT-WEB",
      "p-signature": "<RSA_Signature>",
      "Content-Type": "application/json"
    }
  });

  return res.data; // { code: 'SUCCESS', data: { status: 'PAID', ... } }
}`,
                'php': `<?php
$data = [
    'orderId' => 'ORD_1720000000',
    'txnId'   => 'TXN_9823412'
];

$ch = curl_init('https://sandbox.pay2pay.vn/api/v2/payment/check-status');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer <accessToken>',
    'p-client-id: MERCHANT-WEB',
    'p-signature: <RSA_Signature>',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
print_r(json_decode($response, true));
?>`,
                'python': `import requests

res = requests.post(
    "https://sandbox.pay2pay.vn/api/v2/payment/check-status",
    json={"orderId": "ORD_1720000000", "txnId": "TXN_9823412"},
    headers={
        "Authorization": "Bearer <accessToken>",
        "p-client-id": "MERCHANT-WEB",
        "p-signature": "<RSA_Signature>",
        "Content-Type": "application/json"
    }
)
print(res.json())`
            }
        },

        'rsa': {
            titleVi: 'Tạo chữ ký số điện tử (SHA256withRSA)',
            titleEn: 'Generate Digital Signature (SHA256withRSA)',
            descVi: 'Tất cả API gửi tới Pay2Pay đều cần chữ ký RSA-2048 để xác thực danh tính Merchant.',
            descEn: 'All API requests sent to Pay2Pay require an RSA-2048 signature for Merchant authentication.',
            endpoint: 'Algorithm: SHA256withRSA (PKCS#1 v1.5)',
            snippets: {
                'curl': `# Chuỗi ký: nối các header bắt đầu bằng p- (theo bảng chữ cái) + request body
# dataToSign = "MERCHANT-WEB" + '{"amount":450000,"orderId":"ORD_1720000000"}'

echo -n "$dataToSign" | openssl dgst -sha256 -sign private_key.pem | openssl base64 -A`,
                'node': `const crypto = require('crypto');
const fs = require('fs');

function signPayload(dataString, privateKeyPem) {
  const signer = crypto.createSign('SHA256');
  signer.update(dataString, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

const privateKey = fs.readFileSync('private_key.pem', 'utf8');
const signature = signPayload("MERCHANT-WEB" + JSON.stringify(requestBody), privateKey);
console.log("p-signature:", signature);`,
                'php': `<?php
function generateSignature($dataString, $privateKeyPem) {
    $privateKey = openssl_pkey_get_private($privateKeyPem);
    openssl_sign($dataString, $binarySignature, $privateKey, OPENSSL_ALGO_SHA256);
    return base64_encode($binarySignature);
}

$privateKey = file_get_contents('private_key.pem');
$dataToSign = "MERCHANT-WEB" . json_encode($requestBody, JSON_UNESCAPED_SLASHES);
$signature  = generateSignature($dataToSign, $privateKey);
echo "p-signature: " . $signature;
?>`,
                'python': `import base64
from Cryptodome.Signature import pkcs1_15
from Cryptodome.Hash import SHA256
from Cryptodome.PublicKey import RSA

def generate_signature(data_str: str, private_key_pem: str) -> str:
    key = RSA.import_key(private_key_pem)
    h = SHA256.new(data_str.encode('utf-8'))
    signature = pkcs1_15.new(key).sign(h)
    return base64.b64encode(signature).decode('utf-8')`
            }
        },

        'refund': {
            titleVi: 'Hoàn tiền giao dịch (Refund API)',
            titleEn: 'Refund Transaction (Refund API)',
            descVi: 'Chủ động hoàn tiền toàn phần hoặc một phần cho khách hàng qua API.',
            descEn: 'Initiate full or partial refund to customer programmatically via API.',
            endpoint: 'POST https://sandbox.pay2pay.vn/api/v2/payment/refund',
            snippets: {
                'curl': `curl -X POST "https://sandbox.pay2pay.vn/api/v2/payment/refund" \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "p-client-id: MERCHANT-WEB" \\
  -H "p-signature: <RSA_Signature>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORD_1720000000",
    "txnId": "TXN_9823412",
    "amount": 450000,
    "reason": "Khach yeu cau huy don hang"
  }'`,
                'node': `const axios = require('axios');

async function refundOrder(orderId, txnId, amount, reason) {
  const res = await axios.post("https://sandbox.pay2pay.vn/api/v2/payment/refund", {
    orderId,
    txnId,
    amount,
    reason
  }, {
    headers: {
      "Authorization": "Bearer <accessToken>",
      "p-client-id": "MERCHANT-WEB",
      "p-signature": "<RSA_Signature>",
      "Content-Type": "application/json"
    }
  });

  return res.data;
}`,
                'php': `<?php
$refundData = [
    'orderId' => 'ORD_1720000000',
    'txnId'   => 'TXN_9823412',
    'amount'  => 450000,
    'reason'  => 'Khach yeu cau huy don hang'
];

$ch = curl_init('https://sandbox.pay2pay.vn/api/v2/payment/refund');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($refundData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer <accessToken>',
    'p-client-id: MERCHANT-WEB',
    'p-signature: <RSA_Signature>',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
echo $response;
?>`,
                'python': `import requests

res = requests.post(
    "https://sandbox.pay2pay.vn/api/v2/payment/refund",
    json={
        "orderId": "ORD_1720000000",
        "txnId": "TXN_9823412",
        "amount": 450000,
        "reason": "Khach yeu cau huy don hang"
    },
    headers={
        "Authorization": "Bearer <accessToken>",
        "p-client-id": "MERCHANT-WEB",
        "p-signature": "<RSA_Signature>",
        "Content-Type": "application/json"
    }
)
print(res.json())`
            }
        }
    };

    let activeApi = 'webhook';
    let activeLang = 'curl';

    function render() {
        const data = apiData[activeApi];
        if (!data) return;

        // Update Title & Desc
        const titleViEl = document.getElementById('sandbox-title-vi');
        const titleEnEl = document.getElementById('sandbox-title-en');
        const descViEl = document.getElementById('sandbox-desc-vi');
        const descEnEl = document.getElementById('sandbox-desc-en');
        const endpointEl = document.getElementById('sandbox-endpoint');

        if (titleViEl) titleViEl.textContent = data.titleVi;
        if (titleEnEl) titleEnEl.textContent = data.titleEn;
        if (descViEl) descViEl.textContent = data.descVi;
        if (descEnEl) descEnEl.textContent = data.descEn;
        if (endpointEl) endpointEl.textContent = data.endpoint;

        // Update Code Block
        const codeEl = document.getElementById('sandbox-code-block');
        if (codeEl) {
            const rawCode = data.snippets[activeLang] || '';
            codeEl.textContent = rawCode;
            codeEl.className = 'language-' + (activeLang === 'node' ? 'javascript' : activeLang);
            if (window.Prism) {
                Prism.highlightElement(codeEl);
            }
        }

        // Update Line numbers
        renderLineNumbers();

        // Update API active button state
        document.querySelectorAll('.sandbox-api-btn').forEach(btn => {
            const api = btn.getAttribute('data-api');
            if (api === activeApi) {
                btn.classList.add('bg-primary-50', 'border-primary-400', 'text-primary-700', 'font-semibold', 'shadow-xs');
                btn.classList.remove('bg-white', 'border-gray-200', 'text-gray-700');
            } else {
                btn.classList.remove('bg-primary-50', 'border-primary-400', 'text-primary-700', 'font-semibold', 'shadow-xs');
                btn.classList.add('bg-white', 'border-gray-200', 'text-gray-700');
            }
        });

        // Update Lang active button state
        document.querySelectorAll('.sandbox-lang-btn').forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            if (lang === activeLang) {
                btn.classList.add('bg-primary-600', 'text-white', 'shadow-sm', 'font-semibold');
                btn.classList.remove('text-gray-300', 'hover:text-white', 'bg-transparent');
            } else {
                btn.classList.remove('bg-primary-600', 'text-white', 'shadow-sm', 'font-semibold');
                btn.classList.add('text-gray-300', 'hover:text-white', 'bg-transparent');
            }
        });
    }

    function renderLineNumbers() {
        const lineNumbersEl = document.getElementById('sandbox-line-numbers');
        const codeEl = document.getElementById('sandbox-code-block');
        if (!lineNumbersEl || !codeEl) return;

        const lines = codeEl.textContent.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div class="h-5 leading-5 text-[11px] text-gray-500 text-right pr-2">${i}</div>`;
        }
        lineNumbersEl.innerHTML = html;
    }

    function init() {
        // API tabs click
        document.querySelectorAll('.sandbox-api-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeApi = btn.getAttribute('data-api');
                render();
            });
        });

        // Language tabs click
        document.querySelectorAll('.sandbox-lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeLang = btn.getAttribute('data-lang');
                render();
            });
        });

        // Copy button
        const copyBtn = document.getElementById('sandbox-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeEl = document.getElementById('sandbox-code-block');
                if (codeEl) {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        const copyTextVi = document.getElementById('sandbox-copy-text-vi');
                        const copyTextEn = document.getElementById('sandbox-copy-text-en');
                        if (copyTextVi) copyTextVi.textContent = 'Đã sao chép!';
                        if (copyTextEn) copyTextEn.textContent = 'Copied!';
                        setTimeout(() => {
                            if (copyTextVi) copyTextVi.textContent = 'Sao chép';
                            if (copyTextEn) copyTextEn.textContent = 'Copy';
                        }, 2000);
                    });
                }
            });
        }

        render();
    }

    return {
        init,
        render
    };
})();
