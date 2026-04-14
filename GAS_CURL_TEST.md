# GAS 認証エンドポイント確認用 curl（Windows cmd）

対象 URL:

```txt
https://script.google.com/macros/s/AKfycbwF9GcABLfDuflryBd_OZzoowBh39BqqAlYZ7Im20j1hCKCm2kVpMP4zRoCP_RnkehpPw/exec
```

## 1) GET で確認（簡易）

```cmd
curl -L "https://script.google.com/macros/s/AKfycbwF9GcABLfDuflryBd_OZzoowBh39BqqAlYZ7Im20j1hCKCm2kVpMP4zRoCP_RnkehpPw/exec?code=YOUR_CODE"
```

## 2) POST(JSON) で確認

```cmd
curl -L -X POST "https://script.google.com/macros/s/AKfycbwF9GcABLfDuflryBd_OZzoowBh39BqqAlYZ7Im20j1hCKCm2kVpMP4zRoCP_RnkehpPw/exec" ^
  -H "Content-Type: application/json" ^
  --data "{\"code\":\"YOUR_CODE\"}"
```

## 3) POST(form-urlencoded) で確認

```cmd
curl -L -X POST "https://script.google.com/macros/s/AKfycbwF9GcABLfDuflryBd_OZzoowBh39BqqAlYZ7Im20j1hCKCm2kVpMP4zRoCP_RnkehpPw/exec" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data "code=YOUR_CODE"
```

## 期待結果

- 正しいコード: `OK`
- 間違ったコード: `NG`

