import { TextField } from "@mui/material";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  label: string;
  value?: string;
}

const PlaceAutocomplete = ({ onPlaceSelect, label, value }: PlaceAutocompleteProps) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['address_components', 'geometry', 'name', 'formatted_address'], // Important : ajout de address_components
      componentRestrictions: { country: ['fr'] } // si tu veux limiter à la France
    };

    const autocomplete = new places.Autocomplete(inputRef.current, options);
    setPlaceAutocomplete(autocomplete);
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });
  }, [onPlaceSelect, placeAutocomplete]);

  // Set initial value when component mounts or value changes
  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
        <label htmlFor="adresse" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>Adresse</label>
      <TextField
        inputRef={inputRef}
        fullWidth
        variant="filled"
        size="medium"
      />
    </div>
  );
};

export default PlaceAutocomplete;
