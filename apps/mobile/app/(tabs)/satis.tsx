import { Redirect } from "expo-router";

// Bu sekmeye basınca _layout listener'ı /ilan-ver modalını açar; doğrudan
// gelinirse yönlendir.
export default function SatisRedirect() {
  return <Redirect href="/ilan-ver" />;
}
