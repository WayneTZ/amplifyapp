import React, { useState, useEffect } from "react";
import { API, Storage } from "aws-amplify";
import { withAuthenticator, Button } from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";

const initialFormState = { name: "", description: "" };

function App({ signOut }) {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function onChange(e) {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const image = await Storage.get(note.image);
          note.image = image;
        }
        return note;
      })
    );
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    const {
      data: { createNote },
    } = await API.graphql({
      query: createNoteMutation,
      variables: { input: formData },
    });

    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    //alternatively, to do a full data refresh, call the next commented out line.
    //but for now, going at it this way, makes it work from step 4 of the tutorial, to step 5, with the addition of images
    //await fetchNotes();
    setNotes([...notes, { ...createNote, image: formData.image }]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    if (!id) return;
    const newNotesArray = notes.filter((note) => note.id !== id);
    setNotes(newNotesArray);
    try {
      await API.graphql({
        query: deleteNoteMutation,
        variables: { input: { id } },
      });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Note description"
        value={formData.description}
      />
      <input type="file" onChange={onChange} />
      <button onClick={createNote}>Create Note</button>
      <div style={{ marginBottom: 30 }}>
        {notes.map((note) => (
          <div key={note.id || note.name}>
            <h2>{note.name}</h2>
            <p>{note.description}</p>
            <button onClick={() => deleteNote(note)}>Delete note</button>
            {note.image && (
              <img
                src={note.image}
                alt={`${note.name}-display`}
                style={{ width: 400 }}
              />
            )}
          </div>
        ))}
      </div>
      <Button onClick={signOut}>Sign Out</Button>
    </div>
  );
}

export default withAuthenticator(App);
