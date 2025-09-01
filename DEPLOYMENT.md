# 🚀 Deployment Guide

## Pre-Deployment Checklist

### ✅ **Code Quality**
- [ ] All TypeScript errors resolved
- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] All tests pass (if any)

### ✅ **Environment Variables**
- [ ] `NEXT_PUBLIC_API_URL` set to production API
- [ ] `NEXT_PUBLIC_WS_URL` set to production WebSocket URL
- [ ] No sensitive data in client-side code

### ✅ **API Configuration**
- [ ] Backend API is deployed and accessible
- [ ] CORS configured for your domain
- [ ] WebSocket endpoint is working
- [ ] Authentication endpoints are functional

## Vercel Deployment Steps

### 1. **GitHub Setup**
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. **Vercel Project Setup**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Configure environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://trauma-board-api.onrender.com
   NEXT_PUBLIC_WS_URL=wss://trauma-board-api.onrender.com/ws
   ```

### 3. **Deploy**
- Vercel will automatically build and deploy
- Check the deployment logs for any errors
- Test the deployed application

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://trauma-board-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket connection URL | `wss://trauma-board-api.onrender.com/ws` |

## Troubleshooting

### Build Errors
- Check TypeScript compilation: `npm run type-check`
- Verify all dependencies are installed: `npm install`
- Check for missing environment variables

### Runtime Errors
- Verify API endpoints are accessible
- Check WebSocket connection
- Review browser console for errors

### Performance Issues
- Enable Vercel Analytics
- Check bundle size with `npm run build`
- Optimize images and assets

## Post-Deployment

### ✅ **Testing Checklist**
- [ ] Application loads without errors
- [ ] Authentication works
- [ ] Case creation/editing functions
- [ ] Drag-and-drop functionality
- [ ] WebSocket real-time updates
- [ ] Responsive design on mobile
- [ ] All navigation works

### ✅ **Monitoring**
- Set up Vercel Analytics
- Monitor error rates
- Check API response times
- Monitor WebSocket connections

## Rollback Plan

If deployment fails:
1. Check Vercel deployment logs
2. Fix issues in development
3. Push new commit to trigger redeployment
4. Use Vercel's rollback feature if needed

## Support

For deployment issues:
- Check Vercel documentation
- Review Next.js deployment guide
- Check GitHub Actions logs (if using CI/CD)
