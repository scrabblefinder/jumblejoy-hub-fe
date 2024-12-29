import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { format } from 'https://esm.sh/date-fns@3.3.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JumbleData {
  Date: string;
  Clues: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    a1: string;
    a2: string;
    a3: string;
    a4: string;
  };
  Caption: {
    v1: string;
  };
  Solution: {
    s1: string;
  };
  Image: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get today's date and format it as YYYYMMDD
    const today = new Date()
    const dateStr = format(today, 'yyyyMMdd')
    
    console.log(`Fetching puzzle for date: ${dateStr}`)
    
    // Try different URL formats
    const urlFormats = [
      `https://www.uclick.com/puzzles/tmjmf/data/tmjmf${dateStr}-data.json`,
      `https://www.uclick.com/puzzles/tmjmf/data/tmjmf${dateStr}.json`,
      `https://www.uclick.com/puzzles/tmjmf/data/tmjmf${dateStr}-data.php`,
      `https://www.uclick.com/puzzles/tmjmf/data/tmjmf${dateStr}.php`
    ]

    let response = null
    let error = null

    // Try each URL format until one works
    for (const url of urlFormats) {
      try {
        console.log(`Trying URL: ${url}`)
        const resp = await fetch(url)
        if (resp.ok) {
          response = resp
          break
        }
        error = `Failed to fetch from ${url}: ${resp.statusText}`
      } catch (e) {
        error = e.message
        console.error(`Error fetching from ${url}:`, e)
        continue
      }
    }

    if (!response) {
      throw new Error(error || 'Failed to fetch puzzle data from all URLs')
    }
    
    const text = await response.text()
    // Remove the jsonCallback wrapper and parse the JSON
    const jsonData: JumbleData = JSON.parse(text.replace(/\/\*\*\/jsonCallback\((.*)\)/, '$1'))

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Format the date for database storage (YYYY-MM-DD)
    const dbDate = format(today, 'yyyy-MM-dd')

    // Check if puzzle already exists for this date
    const { data: existingPuzzle } = await supabase
      .from('daily_puzzles')
      .select()
      .eq('date', dbDate)
      .maybeSingle()

    if (existingPuzzle) {
      console.log(`Puzzle for ${dbDate} already exists`)
      return new Response(
        JSON.stringify({ message: `Puzzle for ${dbDate} already exists` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Inserting new puzzle for ${dbDate}`)

    // Insert the puzzle
    const { data: puzzle, error: puzzleError } = await supabase
      .from('daily_puzzles')
      .insert({
        date: dbDate,
        caption: jsonData.Caption.v1,
        image_url: jsonData.Image,
        solution: jsonData.Solution.s1,
      })
      .select()
      .single()

    if (puzzleError) {
      console.error('Error inserting puzzle:', puzzleError)
      throw puzzleError
    }

    // Insert the jumble words
    const jumbleWords = [
      { puzzle_id: puzzle.id, jumbled_word: jsonData.Clues.c1, answer: jsonData.Clues.a1 },
      { puzzle_id: puzzle.id, jumbled_word: jsonData.Clues.c2, answer: jsonData.Clues.a2 },
      { puzzle_id: puzzle.id, jumbled_word: jsonData.Clues.c3, answer: jsonData.Clues.a3 },
      { puzzle_id: puzzle.id, jumbled_word: jsonData.Clues.c4, answer: jsonData.Clues.a4 },
    ]

    const { error: wordsError } = await supabase
      .from('jumble_words')
      .insert(jumbleWords)

    if (wordsError) {
      console.error('Error inserting jumble words:', wordsError)
      throw wordsError
    }

    console.log(`Successfully added puzzle for ${dbDate}`)

    return new Response(
      JSON.stringify({ message: 'Puzzle added successfully', puzzle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})