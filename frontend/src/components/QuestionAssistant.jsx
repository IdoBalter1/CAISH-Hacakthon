import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Stack,
  Alert
} from '@mui/material'
import {
  Send,
  Save,
  FileDownload,
  PictureAsPdf,
  Description,
  Image,
  Delete,
  Add
} from '@mui/icons-material'
import { Capacitor } from '@capacitor/core'
// html2canvas will be imported dynamically when needed
import './QuestionAssistant.css'

const QuestionAssistant = () => {
  const [messages, setMessages] = useState([])
  const [notepad, setNotepad] = useState([])
  const [input, setInput] = useState('')
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const messagesEndRef = useRef(null)
  const notepadRef = useRef(null)

  // Load saved notepad from localStorage on mount
  useEffect(() => {
    const savedNotepad = localStorage.getItem('questionAssistantNotepad')
    if (savedNotepad) {
      try {
        setNotepad(JSON.parse(savedNotepad))
      } catch (e) {
        console.error('Error loading saved notepad:', e)
      }
    }
  }, [])

  // Auto-save notepad when it changes
  useEffect(() => {
    if (notepad.length > 0) {
      const autoSaveTimer = setTimeout(() => {
        try {
          localStorage.setItem('questionAssistantNotepad', JSON.stringify(notepad))
        } catch (e) {
          console.error('Error auto-saving notepad:', e)
        }
      }, 1000) // Auto-save after 1 second of no changes
      return () => clearTimeout(autoSaveTimer)
    }
  }, [notepad])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save notepad to localStorage
  const saveNotepad = () => {
    try {
      localStorage.setItem('questionAssistantNotepad', JSON.stringify(notepad))
      setSaveStatus('Saved!')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      setSaveStatus('Error saving')
      console.error('Error saving notepad:', e)
    }
  }

  // Send a message (mock Claude)
  const sendMessage = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])

    // Mock Claude response
    const claudeMessage = {
      role: 'claude',
      content: `I understand you're asking about: "${input}". This is a placeholder response. In production, this will connect to Claude API for intelligent answers about the lecture content.`
    }
    setMessages((prev) => [...prev, claudeMessage])

    setInput('')
  }

  // Summarize user questions and add to notepad
  const summarizeToNotepad = () => {
    // Get the last user message
    const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user')
    if (lastUserMsg) {
      const summaryPoint = `• ${lastUserMsg.content} (unclear)`
      setNotepad(prev => [...prev, summaryPoint])
    }
  }

  // Edit notepad items
  const updateNotepadItem = (index, value) => {
    const updated = [...notepad]
    updated[index] = value
    setNotepad(updated)
  }

  // Delete notepad item
  const deleteNotepadItem = (index) => {
    setNotepad(prev => prev.filter((_, i) => i !== index))
  }

  // Export functions
  const exportToPDF = async () => {
    try {
      const content = notepad.join('\n\n')
      if (!content || content.trim() === '') {
        alert('No content to export. Please add some notes to the notepad first.')
        return
      }

      console.log('Exporting to PDF, platform:', Capacitor.isNativePlatform() ? 'iOS' : 'Web')

      // Use Capacitor Share for iOS
      if (Capacitor.isNativePlatform()) {
        try {
          const { Share } = await import('@capacitor/share')
          console.log('Using Share plugin for PDF export on iOS')
          const result = await Share.share({
            title: 'Question Notepad Export',
            text: `Question Notepad Export\nExported on: ${new Date().toLocaleString()}\n\n${content}`,
            dialogTitle: 'Share your notepad'
          })
          console.log('Share result:', result)
          setExportMenuAnchor(null)
          return
        } catch (shareErr) {
          console.error('Share error:', shareErr)
          alert('Share failed: ' + (shareErr.message || 'Unknown error') + '. Trying clipboard...')
          // Try clipboard as fallback
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
              await navigator.clipboard.writeText(`Question Notepad Export\nExported on: ${new Date().toLocaleString()}\n\n${content}`)
              alert('Content copied to clipboard!')
              setExportMenuAnchor(null)
              return
            } catch (clipErr) {
              console.log('Clipboard error:', clipErr)
            }
          }
          // Final fallback: show content
          alert(`Question Notepad Export\n\nExported on: ${new Date().toLocaleString()}\n\n${content}`)
          setExportMenuAnchor(null)
          return
        }
      }

      // Web method
      openPrintWindow(content)
      setExportMenuAnchor(null)
    } catch (err) {
      console.error('Error exporting to PDF:', err)
      alert('Error exporting to PDF: ' + (err.message || 'Please try again.'))
      setExportMenuAnchor(null)
    }
  }

  const openPrintWindow = (content) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow pop-ups to export as PDF')
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Question Notepad Export</title>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                padding: 20px; 
                line-height: 1.6;
                color: #2E2E2E;
                background: #ECECEC;
              }
              h1 { 
                color: #2E2E2E; 
                margin-bottom: 10px;
              }
              .note-item { 
                margin-bottom: 15px; 
                padding: 15px; 
                border-left: 3px solid #A7CDB8;
                background: white;
                border-radius: 4px;
              }
              @media print {
                body { background: white; }
              }
            </style>
          </head>
          <body>
            <h1>Question Notepad</h1>
            <p><strong>Exported on:</strong> ${new Date().toLocaleString()}</p>
            <div>${content.split('\n\n').map(note => `<div class="note-item">${note.replace(/\n/g, '<br>')}</div>`).join('')}</div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    } catch (err) {
      console.error('Error opening print window:', err)
      alert('Error opening print dialog. Please try again.')
    }
  }

  const exportToWord = async () => {
    try {
      const content = notepad.join('\n\n')
      if (!content || content.trim() === '') {
        alert('No content to export. Please add some notes to the notepad first.')
        return
      }

      console.log('Exporting to Word, platform:', Capacitor.isNativePlatform() ? 'iOS' : 'Web')

      // Use Capacitor Share plugin for iOS
      if (Capacitor.isNativePlatform()) {
        try {
          const { Share } = await import('@capacitor/share')
          console.log('Using Share plugin for iOS')
          const result = await Share.share({
            title: 'Question Notepad Export',
            text: `Question Notepad Export\nExported on: ${new Date().toLocaleString()}\n\n${content}`,
            dialogTitle: 'Share your notepad'
          })
          console.log('Share result:', result)
          setExportMenuAnchor(null)
          return
        } catch (shareErr) {
          console.error('Share plugin error:', shareErr)
          alert('Share failed: ' + (shareErr.message || 'Unknown error') + '. Trying fallback method...')
          // Fall through to text sharing
        }
      }

      // For iOS fallback or web: try clipboard first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(`Question Notepad Export\nExported on: ${new Date().toLocaleString()}\n\n${content}`)
          alert('Content copied to clipboard! You can paste it into any app.')
          setExportMenuAnchor(null)
          return
        } catch (clipErr) {
          console.log('Clipboard error:', clipErr)
        }
      }

      // Final fallback: show content in alert
      alert(`Question Notepad Export\n\nExported on: ${new Date().toLocaleString()}\n\n${content}`)
      setExportMenuAnchor(null)
    } catch (err) {
      console.error('Error exporting to Word:', err)
      alert('Error exporting to Word: ' + (err.message || 'Please try again.'))
      setExportMenuAnchor(null)
    }
  }

  // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const exportToJPG = async () => {
    try {
      if (!notepadRef.current) {
        alert('No content to export. Please add some notes to the notepad first.')
        setExportMenuAnchor(null)
        return
      }

      if (notepad.length === 0) {
        alert('No content to export. Please add some notes to the notepad first.')
        setExportMenuAnchor(null)
        return
      }

      console.log('Exporting to JPG, platform:', Capacitor.isNativePlatform() ? 'iOS' : 'Web')

      // Import html2canvas dynamically to ensure it's loaded
      const html2canvas = (await import('html2canvas')).default

      // Create a canvas to render the notepad
      const canvas = await html2canvas(notepadRef.current, {
        backgroundColor: '#ECECEC',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      })

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Error creating image. Please try again.')
          setExportMenuAnchor(null)
          return
        }

        // Use Capacitor Share plugin for iOS
        if (Capacitor.isNativePlatform()) {
          try {
            console.log('iOS detected, using Share plugin for JPG export')
            const { Share } = await import('@capacitor/share')
            
            // Convert canvas to data URL for sharing
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            
            // For iOS, try sharing the image directly using data URL
            // First try with Filesystem + Share
            try {
              const { Filesystem, Directory } = await import('@capacitor/filesystem')
              const base64 = dataUrl.split(',')[1] // Remove data:image/jpeg;base64, prefix
              const fileName = `question-notepad-${Date.now()}.jpg`
              
              console.log('Saving file to Documents directory:', fileName)
              
              await Filesystem.writeFile({
                path: fileName,
                data: base64,
                directory: Directory.Documents,
              })
              
              console.log('File saved, getting URI...')
              
              const fileUri = await Filesystem.getUri({
                path: fileName,
                directory: Directory.Documents,
              })
              
              console.log('File URI:', fileUri.uri)
              
              await Share.share({
                title: 'Question Notepad Export',
                text: 'My lecture questions',
                url: fileUri.uri,
                dialogTitle: 'Share your notepad image'
              })
              
              console.log('Share completed')
              setExportMenuAnchor(null)
              return
            } catch (fsErr) {
              console.log('Filesystem method failed, trying direct share:', fsErr)
              // Fallback: try sharing with data URL (may not work on all iOS versions)
              // For now, show image in new window as fallback
              const newWindow = window.open()
              if (newWindow) {
                newWindow.document.write(`
                  <html>
                    <head><title>Question Notepad Export</title></head>
                    <body style="margin:0; padding:20px; background:#ECECEC;">
                      <h2>Question Notepad Export</h2>
                      <p>Long press the image below to save it:</p>
                      <img src="${dataUrl}" style="max-width: 100%; border: 2px solid #A7CDB8; border-radius: 8px;" />
                    </body>
                  </html>
                `)
                alert('Image opened in new window. Long press the image to save it to your Photos.')
                setExportMenuAnchor(null)
                return
              }
              throw fsErr
            }
          } catch (shareErr) {
            console.error('Share plugin error:', shareErr)
            alert('Share failed: ' + (shareErr.message || 'Unknown error') + '. Opening image in new window...')
            // Fall through to web download method
          }
        }

        // Web download method - works on web and as fallback
        try {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `question-notepad-${new Date().toISOString().split('T')[0]}.jpg`
          link.href = url
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          setTimeout(() => {
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            setExportMenuAnchor(null)
          }, 200)
        } catch (downloadErr) {
          console.error('Download error:', downloadErr)
          // Fallback: show image in new window
          const imageUrl = canvas.toDataURL('image/jpeg', 0.95)
          const newWindow = window.open()
          if (newWindow) {
            newWindow.document.write(`<img src="${imageUrl}" style="max-width: 100%;" />`)
            newWindow.document.title = 'Question Notepad Export'
            setExportMenuAnchor(null)
          } else {
            alert('Please allow pop-ups to export the image, or use the Share option on iOS.')
            setExportMenuAnchor(null)
          }
        }
      }, 'image/jpeg', 0.95)
    } catch (err) {
      console.error('Error exporting to JPG:', err)
      alert('Error exporting to JPG: ' + (err.message || 'Please try again.'))
      setExportMenuAnchor(null)
    }
  }

  const handleExportMenuOpen = (event) => {
    console.log('Export button clicked', event)
    event.preventDefault()
    event.stopPropagation()
    setExportMenuAnchor(event.currentTarget)
    console.log('Menu anchor set:', event.currentTarget)
  }

  const handleExportMenuClose = () => {
    console.log('Closing export menu')
    setExportMenuAnchor(null)
  }

  return (
    <Box className="question-assistant" sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
          💬 Question Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ask questions about unclear parts of the lecture
        </Typography>
      </Box>

      <Stack spacing={3} direction={{ xs: 'column', md: 'row' }} sx={{ alignItems: 'flex-start' }}>
        {/* Chat Panel */}
        <Paper elevation={3} sx={{ flex: 1, minWidth: { xs: '100%', md: '400px' }, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Chat with AI Assistant
            </Typography>
          </Box>
          <Box sx={{ height: '400px', overflowY: 'auto', p: 2 }}>
            {messages.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Start a conversation by asking a question about the lecture!
              </Alert>
            ) : (
              <List>
                {messages.map((msg, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      mb: 2,
                      bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Chip
                      label={msg.role === 'user' ? 'You' : 'AI Assistant'}
                      size="small"
                      color={msg.role === 'user' ? 'primary' : 'default'}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body1">{msg.content}</Typography>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's unclear in lectures? What do you want to ask today?"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={sendMessage}
                disabled={!input.trim()}
                sx={{ textTransform: 'none' }}
              >
                Send
              </Button>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={summarizeToNotepad}
                disabled={messages.length === 0}
                sx={{ textTransform: 'none' }}
              >
                Add to Notepad
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Editable Notepad */}
        <Paper
          ref={notepadRef}
          elevation={3}
          sx={{ flex: 1, minWidth: { xs: '100%', md: '400px' }, borderRadius: 3, overflow: 'hidden' }}
        >
          <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              📝 Notepad (Editable Questions)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Questions you want to review later
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Save />}
                onClick={saveNotepad}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
              {saveStatus && (
                <Chip label={saveStatus} color="success" size="small" />
              )}
              <Button
                id="export-button"
                variant="outlined"
                size="small"
                startIcon={<FileDownload />}
                endIcon={<FileDownload />}
                onClick={(e) => {
                  console.log('Export button clicked!', e)
                  handleExportMenuOpen(e)
                }}
                sx={{ 
                  textTransform: 'none', 
                  zIndex: 1, 
                  position: 'relative',
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                MenuListProps={{
                  'aria-labelledby': 'export-button',
                }}
                slotProps={{
                  paper: {
                    sx: {
                      zIndex: 10000,
                      position: 'relative',
                    }
                  }
                }}
                container={() => document.querySelector('.apple-modal-base') || document.body}
              >
                <MenuItem onClick={async () => { 
                  handleExportMenuClose();
                  await new Promise(resolve => setTimeout(resolve, 100));
                  exportToPDF(); 
                }}>
                  <PictureAsPdf sx={{ mr: 1 }} />
                  Export as PDF
                </MenuItem>
                <MenuItem onClick={async () => { 
                  handleExportMenuClose();
                  await new Promise(resolve => setTimeout(resolve, 100));
                  await exportToWord(); 
                }}>
                  <Description sx={{ mr: 1 }} />
                  Export as Word
                </MenuItem>
                <MenuItem onClick={async () => { 
                  handleExportMenuClose();
                  await new Promise(resolve => setTimeout(resolve, 100));
                  await exportToJPG(); 
                }}>
                  <Image sx={{ mr: 1 }} />
                  Export as JPG
                </MenuItem>
              </Menu>
            </Stack>
            {notepad.length === 0 ? (
              <Alert severity="info">
                No questions in notepad yet. Ask a question and click "Add to Notepad" to save it here.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {notepad.map((note, i) => (
                  <Box key={i} sx={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={note}
                      onChange={(e) => updateNotepadItem(i, e.target.value)}
                      placeholder="Edit your question..."
                      variant="outlined"
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => deleteNotepadItem(i)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'error.main',
                      }}
                      aria-label="Delete note"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Paper>
      </Stack>
    </Box>
  )
}

export default QuestionAssistant

