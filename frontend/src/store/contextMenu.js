import { reactive } from 'vue'

export const contextMenuState = reactive({
  isOpen: false,
  x: 0,
  y: 0,
  items: [],
  
  open(event, menuItems) {
    event.preventDefault()
    this.isOpen = false // Reset animation
    
    setTimeout(() => {
      // Calculate boundaries so it doesn't overflow screen
      const menuWidth = 200
      const menuHeight = menuItems.length * 40
      
      let x = event.clientX
      let y = event.clientY
      
      if (x + menuWidth > window.innerWidth) x -= menuWidth
      if (y + menuHeight > window.innerHeight) y -= menuHeight
      
      this.x = x
      this.y = y
      this.items = menuItems
      this.isOpen = true
    }, 10)
  },
  
  close() {
    this.isOpen = false
  }
})
