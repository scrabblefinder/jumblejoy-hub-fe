import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchPuzzleXML } from './puzzle-fetcher.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date, jsonUrl } = await req.json()
    
    // Format the date to ensure it's in YYYY-MM-DD format
    const formattedDate = date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3')
    console.log('Formatted date:', formattedDate)
    
    // Use the provided JSON URL or construct one based on the date
    const url = jsonUrl || `https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX1+b5Y+X7zaEFHSWJrCGS0ZTfgh8ArjtJXrQId7t4Y1oVKwUDKd4WyEo%0A/g/tmjms/d/${formattedDate}/data.json?callback=jsonCallback&_=${Date.now()}`
    
    console.log('Fetching puzzle from URL:', url)
    const puzzleData = await fetchPuzzleXML(url)
    console.log('Received puzzle data:', puzzleData.substring(0, 200) + '...') // Log first 200 chars

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the JSON data
    const data = JSON.parse(puzzleData)
    console.log('Parsed puzzle data:', data)

    // Clean up the solution
    const rawSolution = data.Solution?.s1 || ''
    const cleanSolution = rawSolution.replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()
    console.log('Cleaned solution:', cleanSolution)

    // Calculate final jumble from circled letters
    const finalJumble = calculateFinalJumble(data)
    console.log('Calculated final jumble:', finalJumble)

    // Insert into daily_puzzles
    const { data: puzzle, error: puzzleError } = await supabaseAdmin
      .from('daily_puzzles')
      .insert({
        date: formattedDate,
        caption: data.Caption?.v1 || '',
        image_url: data.Image || '',
        solution: cleanSolution,
        final_jumble: finalJumble,
        final_jumble_answer: cleanSolution
      })
      .select()
      .single()

    if (puzzleError) throw puzzleError

    // Insert jumble words
    if (data.Clues) {
      const jumbleWords = [
        { jumbled_word: data.Clues.c1, answer: data.Clues.a1 },
        { jumbled_word: data.Clues.c2, answer: data.Clues.a2 },
        { jumbled_word: data.Clues.c3, answer: data.Clues.a3 },
        { jumbled_word: data.Clues.c4, answer: data.Clues.a4 },
        { jumbled_word: data.Clues.c5, answer: data.Clues.a5 },
        { jumbled_word: data.Clues.c6, answer: data.Clues.a6 }
      ].filter(word => word.jumbled_word && word.answer)

      if (jumbleWords.length > 0) {
        const { error: wordsError } = await supabaseAdmin
          .from('jumble_words')
          .insert(
            jumbleWords.map(word => ({
              puzzle_id: puzzle.id,
              jumbled_word: word.jumbled_word,
              answer: word.answer
            }))
          )

        if (wordsError) throw wordsError
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: `Failed to fetch or process puzzle: ${error.message}` }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Helper function to calculate final jumble from circled letters
function calculateFinalJumble(data: any): string {
  if (!data?.Clues) return '';

  try {
    console.log('Calculating final jumble from data:', data.Clues);
    
    // Extract ALL answers and positions (up to 6 clues)
    const answers = [
      { word: data.Clues.a1, positions: data.Clues.o1 },
      { word: data.Clues.a2, positions: data.Clues.o2 },
      { word: data.Clues.a3, positions: data.Clues.o3 },
      { word: data.Clues.a4, positions: data.Clues.o4 },
      { word: data.Clues.a5, positions: data.Clues.o5 },
      { word: data.Clues.a6, positions: data.Clues.o6 }
    ].filter(answer => answer.word && answer.positions); // Only process clues that exist

    console.log('Processing answers:', answers);

    // For each answer, get the letters at the specified positions and join them
    const jumbledParts = answers.map(({ word, positions }) => {
      // Convert positions string like "1,4,5" to array of numbers and subtract 1 for zero-based indexing
      const pos = positions.split(',').map(p => parseInt(p) - 1);
      
      // Get letters at those positions
      const letters = pos.map(p => word[p]).join('');
      console.log(`From word ${word} at positions ${positions} got letters: ${letters}`);
      
      return letters;
    });

    // Join all parts to create final jumble
    const finalJumble = jumbledParts.join('');
    console.log('Final jumble calculated:', finalJumble);
    
    return finalJumble;
  } catch (error) {
    console.error('Error calculating final jumble:', error);
    return '';
  }
}