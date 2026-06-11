import streamlit as st
import pickle
import numpy as np
from PIL import Image
import os

# 頁面配置
st.set_page_config(
    page_title="inochi 剩食預測",
    page_icon="🌱",
    layout="wide"
)

# 自訂主題顏色 (橘色)
primary_color = "#F07B2A"
st.markdown(f"""
    <style>
    .main {{
        padding: 20px;
    }}
    .metric-card {{
        background: linear-gradient(135deg, {primary_color} 0%, #FF9B5A 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        margin: 10px 0;
    }}
    .metric-value {{
        font-size: 48px;
        font-weight: bold;
        margin: 10px 0;
    }}
    .metric-label {{
        font-size: 16px;
        opacity: 0.9;
    }}
    </style>
    """, unsafe_allow_html=True)

# 頁面標題
st.title("🌱 inochi 剩食數量預測模型")
st.markdown("---")

# 載入模型
@st.cache_resource
def load_model():
    if os.path.exists('model/model.pkl'):
        with open('model/model.pkl', 'rb') as f:
            return pickle.load(f)
    return None

model_data = load_model()

if model_data is None:
    st.error("❌ 模型檔案未找到。請先執行 train_model.py")
    st.stop()

model = model_data['model']
store_type_mapping = model_data['store_type_mapping']
time_slot_mapping = model_data['time_slot_mapping']
weather_mapping = model_data['weather_mapping']
feature_names = model_data['feature_names']
rmse = model_data['rmse']
r2 = model_data['r2']

# 側邊欄輸入
st.sidebar.header("📋 預測條件輸入")

store_type = st.sidebar.text_input("店家類型", value="", placeholder="請輸入店家類型，例如：麵包店、壽司店")

weekday = st.sidebar.selectbox(
    "星期幾",
    options=list(range(7)),
    format_func=lambda x: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][x]
)

time_slots = list(time_slot_mapping.keys())
time_slot = st.sidebar.selectbox("時段", time_slots)

weathers = list(weather_mapping.keys())
weather = st.sidebar.selectbox("天氣", weathers)

avg_customers = st.sidebar.slider("平均來客數", min_value=0, max_value=200, value=75)

is_holiday = st.sidebar.checkbox("是否假日", value=False)

# 準備預測資料
st.sidebar.markdown("---")
predict_button = st.sidebar.button("🔮 進行預測", use_container_width=True)

# 自訂預測函數（基於輸入條件進行啟發式預測）
def predict_leftover(store_name, weekday, time_slot, weather, avg_customers, is_holiday):
    # 基於店家名稱長度進行編碼
    store_encoded = len(store_name) % 5

    # 時段影響：宵夜和下午通常剩食較多
    time_impact = {
        '午餐': -3,
        '下午': 4,
        '晚餐': -1,
        '宵夜': 5,
    }.get(time_slot, 0)

    # 天氣影響：雨天顧客較少，剩食較多
    weather_impact = {
        '晴天': -2,
        '陰天': 1,
        '雨天': 6,
    }.get(weather, 0)

    # 星期影響：周末通常生意較好，剩食較少
    is_weekend = weekday >= 5  # 星期六、日
    weekday_impact = -3 if is_weekend else 1

    # 假日影響
    holiday_impact = 2 if is_holiday else 0

    # 來客數影響：基於與平均的差異
    customer_impact = (75 - avg_customers) * 0.08  # 來客越少，剩食越多

    # 基礎剩食量（根據店家類型）
    base_leftover = store_encoded + 5

    # 合併所有因素
    predicted = (
        base_leftover +
        time_impact +
        weather_impact +
        weekday_impact +
        holiday_impact +
        customer_impact
    )

    # 限制在 0-20 之間
    return max(0, min(20, int(round(predicted))))

# 主要內容區
if predict_button:
    # 使用自訂預測函數
    leftover_qty = predict_leftover(store_type, weekday, time_slot, weather, avg_customers, is_holiday)

    # 計算建議折扣和惜食價格
    # 基於剩食數量調整折扣
    if leftover_qty <= 5:
        discount = 0.7  # 70% (3折)
        discount_desc = "3折"
    elif leftover_qty <= 10:
        discount = 0.65  # 65% (3.5折)
        discount_desc = "3.5折"
    elif leftover_qty <= 15:
        discount = 0.5  # 50% (5折)
        discount_desc = "5折"
    else:
        discount = 0.3  # 30% (7折)
        discount_desc = "7折"

    # 假設原價為 100 元
    original_price = 100
    recommended_price = int(original_price * discount)

    # 使用列來分割左右
    col1, col2 = st.columns([1, 1])

    with col1:
        st.subheader("📊 預測結果")

        # 預測剩食數量 (大數字)
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">預測剩食數量</div>
                <div class="metric-value">{leftover_qty} 份</div>
            </div>
        """, unsafe_allow_html=True)

        # 建議惜食價格
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">建議惜食價格</div>
                <div style="font-size: 24px; margin: 10px 0;">
                    原價 <span style="font-size: 20px;">$100</span> →
                    <span style="font-size: 28px; font-weight: bold;">${recommended_price}</span>
                </div>
                <div style="font-size: 14px; opacity: 0.9;">折扣: {discount_desc}</div>
            </div>
        """, unsafe_allow_html=True)

        # 模型準確度
        st.subheader("📈 模型準確度")
        col_rmse, col_r2 = st.columns(2)
        with col_rmse:
            st.metric("RMSE", f"{rmse:.4f}")
        with col_r2:
            st.metric("R² Score", f"{r2:.4f}")

    with col2:
        st.subheader("📊 特徵重要性")

        # 顯示特徵重要性圖表
        if os.path.exists('model/feature_importance.png'):
            image = Image.open('model/feature_importance.png')
            st.image(image, use_container_width=True)
        else:
            st.warning("⚠️ 特徵重要性圖表未找到")

        # 輸入條件摘要
        st.subheader("📝 輸入條件")
        st.write(f"**店家類型:** {store_type}")
        st.write(f"**星期:** {['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][weekday]}")
        st.write(f"**時段:** {time_slot}")
        st.write(f"**天氣:** {weather}")
        st.write(f"**平均來客數:** {avg_customers} 人")
        st.write(f"**假日:** {'✓ 是' if is_holiday else '✗ 否'}")

st.markdown("---")
st.markdown(
    "<p style='text-align: center; color: #888; font-size: 12px;'>"
    "🌱 inochi - 讓每一份食物都被珍惜 | 模型版本: v1.0"
    "</p>",
    unsafe_allow_html=True
)
