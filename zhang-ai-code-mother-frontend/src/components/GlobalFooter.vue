<template>
  <a-layout-footer class="footer">
    <div class="footer-content">
      <div class="footer-brand">一句话，生成你想要的应用</div>
      <p class="copyright">Zhang AI 应用生成平台 · 让创意更快落地</p>
    </div>
  </a-layout-footer>
</template>

<style scoped>
.footer {
  background: transparent;
  text-align: center;
  padding: 20px 24px 32px;
}

.footer-content {
  width: min(1200px, 100%);
  margin: 0 auto;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding-top: 20px;
}

.footer-brand {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6px;
}

.copyright {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
</style>
