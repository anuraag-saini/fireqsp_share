// lib/file-storage.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class FileStorage {
  static async uploadFile(userId: string, file: File, jobId: string): Promise<string> {
    const fileName = `${userId}/${jobId}/${file.name}`
    
    const { data, error } = await supabase.storage
      .from('extraction-files')
      .upload(fileName, file)
      
    if (error) throw new Error(`Upload failed: ${error.message}`)
    return fileName
  }
  
  static async downloadFile(path: string): Promise<ArrayBuffer> {
    const { data, error } = await supabase.storage
      .from('extraction-files')
      .download(path)
      
    if (error) throw new Error(`Download failed: ${error.message}`)
    return await data.arrayBuffer()
  }
  
  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('extraction-files')  
      .remove([path])
      
    if (error) console.error('Delete failed:', error)
  }
  
  static async deleteJobFiles(userId: string, jobId: string): Promise<void> {
    const folderPath = `${userId}/${jobId}`
    
    const { data: files } = await supabase.storage
      .from('extraction-files')
      .list(folderPath)
      
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${folderPath}/${f.name}`)
      await supabase.storage.from('extraction-files').remove(filePaths)
    }
  }
}