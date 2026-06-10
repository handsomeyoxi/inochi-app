import numpy as np
import pandas as pd
import pickle
import matplotlib
matplotlib.rcParams['axes.unicode_minus'] = False
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# 設置隨機種子確保可重現性
np.random.seed(42)

# 生成模擬訓練資料
store_types = ['壽司', '飲料', '麵包', '便當', '關東煮']
time_slots = ['午餐', '下午', '晚餐', '宵夜']
weathers = ['晴天', '陰天', '雨天']

n_samples = 500

data = {
    'store_type': np.random.choice(store_types, n_samples),
    'weekday': np.random.randint(0, 7, n_samples),
    'time_slot': np.random.choice(time_slots, n_samples),
    'weather': np.random.choice(weathers, n_samples),
    'avg_customers': np.random.randint(10, 150, n_samples),
    'is_holiday': np.random.choice([0, 1], n_samples),
}

df = pd.DataFrame(data)

# 編碼分類特徵
store_type_mapping = {name: idx for idx, name in enumerate(store_types)}
time_slot_mapping = {name: idx for idx, name in enumerate(time_slots)}
weather_mapping = {name: idx for idx, name in enumerate(weathers)}

df['store_type_encoded'] = df['store_type'].map(store_type_mapping)
df['time_slot_encoded'] = df['time_slot'].map(time_slot_mapping)
df['weather_encoded'] = df['weather'].map(weather_mapping)

# 生成目標值 (剩食數量)
# 基於特徵的簡單規則來生成合理的目標值
df['leftover_qty'] = (
    2 * df['store_type_encoded'] +
    1 * df['weekday'] +
    1.5 * df['time_slot_encoded'] +
    0.8 * df['weather_encoded'] +
    0.05 * df['avg_customers'] +
    3 * df['is_holiday'] +
    np.random.normal(0, 2, n_samples)
)
df['leftover_qty'] = np.clip(df['leftover_qty'], 0, 20).astype(int)

# 準備訓練資料
X = df[['store_type_encoded', 'weekday', 'time_slot_encoded', 'weather_encoded', 'avg_customers', 'is_holiday']]
y = df['leftover_qty']

# 分割訓練和測試集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 訓練模型
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)
model.fit(X_train, y_train)

# 預測和評估
y_pred = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print(f"RMSE: {rmse:.4f}")
print(f"R2 Score: {r2:.4f}")

# 生成特徵重要性圖表
feature_names = ['store_type', 'weekday', 'time_slot', 'weather', 'avg_customers', 'is_holiday']
importances = model.feature_importances_
indices = np.argsort(importances)[::-1]

plt.figure(figsize=(10, 6))
plt.title('Feature Importance', fontsize=16)
plt.bar(range(len(importances)), importances[indices])
plt.xticks(range(len(importances)), [feature_names[i] for i in indices], rotation=45, ha='right')
plt.ylabel('Importance')
plt.tight_layout()
plt.savefig('model/feature_importance.png', dpi=100, bbox_inches='tight')
plt.close()

# 儲存模型和相關資訊
model_data = {
    'model': model,
    'store_type_mapping': store_type_mapping,
    'time_slot_mapping': time_slot_mapping,
    'weather_mapping': weather_mapping,
    'feature_names': feature_names,
    'rmse': rmse,
    'r2': r2
}

with open('model/model.pkl', 'wb') as f:
    pickle.dump(model_data, f)

print("\nModel and data saved successfully")
print("Model saved to: model/model.pkl")
print("Feature importance chart saved to: model/feature_importance.png")
