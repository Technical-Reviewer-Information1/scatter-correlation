import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from scipy.stats import pearsonr

st.set_page_config(page_title="散布図と相関係数分析", layout="wide")

st.title("散布図と相関係数分析（pp.26-28）")
st.caption("Created by Dit-Lab.(Daiki ITO)")
st.caption("Supported by Tomoaki ATSUMI")

st.markdown("---")

uploaded_file = st.file_uploader(
    "ExcelファイルまたはCSVファイルをアップロードしてください",
    type=['xlsx', 'xls', 'csv'],
    help="分析したいデータファイルを選択してください"
)

use_demo_data = st.checkbox(
    "デモデータを使用する",
    value=False,
    help="サンプルデータを使って機能を試すことができます"
)

df = None

if use_demo_data:
    try:
        df = pd.read_excel('demo_data.xlsx')
        st.success("デモデータを読み込みました！")
        st.info(f"データサイズ: {df.shape[0]}行, {df.shape[1]}列")
    except FileNotFoundError:
        st.error("デモデータファイルが見つかりません。")
elif uploaded_file is not None:
    try:
        if uploaded_file.name.endswith('.csv'):
            df = pd.read_csv(uploaded_file)
        else:
            df = pd.read_excel(uploaded_file)
        
        st.success(f"ファイル '{uploaded_file.name}' を読み込みました！")
        st.info(f"データサイズ: {df.shape[0]}行, {df.shape[1]}列")
    except Exception as e:
        st.error(f"ファイルの読み込みに失敗しました: {str(e)}")

if df is not None:
    st.markdown("---")
    st.subheader("📊 データ概要")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**データの先頭5行:**")
        st.dataframe(df.head())
    
    with col2:
        st.write("**基本統計量:**")
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_columns:
            st.dataframe(df[numeric_columns].describe())
        else:
            st.warning("数値型の列が見つかりません。")
    
    if len(numeric_columns) >= 2:
        st.markdown("---")
        st.subheader("📈 変数選択と散布図分析")
        
        col_select1, col_select2 = st.columns(2)
        
        with col_select1:
            x_column = st.selectbox(
                "X軸の変数を選択してください:",
                numeric_columns,
                key="x_axis"
            )
        
        with col_select2:
            y_column = st.selectbox(
                "Y軸の変数を選択してください:",
                numeric_columns,
                index=1 if len(numeric_columns) > 1 else 0,
                key="y_axis"
            )
        
        if x_column and y_column and x_column != y_column:
            valid_data = df[[x_column, y_column]].dropna()
            
            if len(valid_data) > 1:
                correlation, p_value = pearsonr(valid_data[x_column], valid_data[y_column])
                
                st.markdown("---")
                
                col_viz, col_stats = st.columns([2, 1])
                
                with col_viz:
                    st.subheader("📊 散布図")
                    
                    fig = px.scatter(
                        valid_data,
                        x=x_column,
                        y=y_column,
                        title=f"{x_column} vs {y_column} の散布図",
                        template="plotly_white"
                    )
                    
                    trend_line = np.polyfit(valid_data[x_column], valid_data[y_column], 1)
                    trend_y = np.poly1d(trend_line)(valid_data[x_column])
                    
                    fig.add_trace(
                        go.Scatter(
                            x=valid_data[x_column],
                            y=trend_y,
                            mode='lines',
                            name='回帰直線',
                            line=dict(color='red', width=2)
                        )
                    )
                    
                    fig.update_layout(
                        xaxis_title=x_column,
                        yaxis_title=y_column,
                        height=500
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                
                with col_stats:
                    st.subheader("📋 統計情報")
                    
                    st.metric(
                        label="相関係数 (r)",
                        value=f"{correlation:.4f}",
                        help="ピアソンの積率相関係数"
                    )
                    
                    st.metric(
                        label="p値",
                        value=f"{p_value:.4f}",
                        help="統計的有意性の指標"
                    )
                    
                    st.metric(
                        label="決定係数 (R²)",
                        value=f"{correlation**2:.4f}",
                        help="分散の説明率"
                    )
                    
                    st.metric(
                        label="有効データ数",
                        value=f"{len(valid_data)}",
                        help="欠損値を除いたデータ数"
                    )
                    
                    if abs(correlation) >= 0.7:
                        strength = "強い"
                        color = "🔴"
                    elif abs(correlation) >= 0.4:
                        strength = "中程度の"
                        color = "🟡"
                    elif abs(correlation) >= 0.2:
                        strength = "弱い"
                        color = "🟢"
                    else:
                        strength = "ほとんどない"
                        color = "⚪"
                    
                    direction = "正の" if correlation > 0 else "負の"
                    
                    st.info(f"{color} **相関の強さ**: {strength}{direction}相関")
                    
                    if p_value < 0.05:
                        st.success("✅ 統計的に有意な相関があります (p < 0.05)")
                    else:
                        st.warning("⚠️ 統計的に有意ではありません (p ≥ 0.05)")
                
                st.markdown("---")
                st.subheader("🔍 相関行列")
                
                corr_matrix = valid_data.corr()
                
                fig_heatmap = px.imshow(
                    corr_matrix,
                    text_auto=True,
                    aspect="auto",
                    color_continuous_scale="RdBu_r",
                    title="相関行列ヒートマップ"
                )
                
                fig_heatmap.update_layout(height=400)
                st.plotly_chart(fig_heatmap, use_container_width=True)
                
            else:
                st.error("有効なデータが不足しています（欠損値を除いて2点以上必要）")
        
        elif x_column == y_column:
            st.warning("異なる変数を選択してください。")
    
    elif len(numeric_columns) == 1:
        st.warning("相関分析には2つ以上の数値型変数が必要です。")
    else:
        st.error("数値型の列が見つかりません。数値データを含むファイルをアップロードしてください。")

else:
    st.info("📁 ファイルをアップロードするか、デモデータを使用して分析を開始してください。")
    
    if not use_demo_data:
        st.markdown("""
        ### 📝 使用方法
        1. **ファイルアップロード**: Excelファイル(.xlsx, .xls)またはCSVファイル(.csv)をアップロードしてください
        2. **デモデータ**: サンプルデータを使って機能を試すことができます
        3. **変数選択**: 分析したい2つの数値変数を選択してください
        4. **結果確認**: 散布図、相関係数、統計的有意性を確認できます
        
        ### 📊 分析内容
        - **散布図**: 2変数間の関係を視覚化
        - **相関係数**: ピアソンの積率相関係数
        - **回帰直線**: データの傾向を示す直線
        - **統計的検定**: p値による有意性の判定
        - **相関行列**: 全変数間の相関をヒートマップで表示
        """)

st.markdown("---")
