export default defineAppConfig({
  ui: {
    colors: {
      primary: 'moss',
      secondary: 'moss',
      success: 'moss',
      info: 'moss',
      warning: 'amber',
      error: 'ember',
      neutral: 'zinc'
    },
    dashboardSidebar: {
      slots: {
        root: 'bg-[var(--desk-elevated)]/90 backdrop-blur-md border-r border-[var(--desk-line)]',
        header: 'h-auto min-h-14 border-b border-[var(--desk-line)] px-3 py-3.5',
        body: 'px-2 py-3 gap-1',
        footer: 'border-t border-[var(--desk-line)] px-3 py-3.5'
      }
    },
    dashboardNavbar: {
      slots: {
        root: 'border-b border-[var(--desk-line)] bg-[var(--desk-elevated)]/80 backdrop-blur-md',
        title: 'font-display text-lg font-semibold tracking-tight text-[var(--desk-ink)]'
      }
    }
  }
})
